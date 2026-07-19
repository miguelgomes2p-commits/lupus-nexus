
-- 1) DROP CRM TABLES (cascade cleans policies/fks/triggers)
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.lead_tags CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.sources CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;

-- Drop CRM-only helper functions
DROP FUNCTION IF EXISTS public.can_access_lead(uuid);
DROP FUNCTION IF EXISTS public.can_access_opportunity(uuid);

-- 2) CLIENT INVOICES TABLE
CREATE TYPE public.invoice_status AS ENUM ('pendente_nfe','pago','cancelado');

CREATE TABLE public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL, -- first day of the reference month
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'pendente_nfe',
  nfe_file_path TEXT,
  nfe_file_name TEXT,
  nfe_uploaded_at TIMESTAMPTZ,
  paid_at DATE,
  email_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, reference_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_invoices TO authenticated;
GRANT ALL ON public.client_invoices TO service_role;

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view invoices"
  ON public.client_invoices FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Authenticated can insert invoices"
  ON public.client_invoices FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update invoices"
  ON public.client_invoices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Managers can delete invoices"
  ON public.client_invoices FOR DELETE
  TO authenticated USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER trg_client_invoices_updated_at
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_invoices_client ON public.client_invoices(client_id);
CREATE INDEX idx_client_invoices_status ON public.client_invoices(status);
CREATE INDEX idx_client_invoices_due ON public.client_invoices(due_date);

-- 3) BACKFILL: generate one invoice per active client per month since contract_start_date
DO $$
DECLARE
  c RECORD;
  ref DATE;
  today DATE := CURRENT_DATE;
  pay_day INT;
  last_dom INT;
  due DATE;
  amt NUMERIC;
BEGIN
  FOR c IN
    SELECT id, contract_start_date,
           COALESCE(monthly_recurring_revenue, contract_value, 0) AS amt
    FROM public.clients
    WHERE status = 'ativo'
      AND contract_start_date IS NOT NULL
  LOOP
    ref := date_trunc('month', c.contract_start_date)::date;
    pay_day := EXTRACT(DAY FROM c.contract_start_date)::INT;
    amt := c.amt;
    WHILE ref <= date_trunc('month', today)::date LOOP
      last_dom := EXTRACT(DAY FROM (ref + INTERVAL '1 month - 1 day'))::INT;
      due := make_date(EXTRACT(YEAR FROM ref)::INT, EXTRACT(MONTH FROM ref)::INT, LEAST(pay_day, last_dom));
      -- Skip months before actual contract start
      IF due >= c.contract_start_date THEN
        INSERT INTO public.client_invoices (client_id, reference_month, due_date, amount, status)
        VALUES (c.id, ref, due, amt, 'pendente_nfe')
        ON CONFLICT (client_id, reference_month) DO NOTHING;
      END IF;
      ref := (ref + INTERVAL '1 month')::date;
    END LOOP;
  END LOOP;
END $$;

-- 4) REWRITE MONTHLY CLOSING: entradas = faturas pagas no período (por paid_at)
CREATE OR REPLACE FUNCTION public.generate_monthly_closing(_reference_date date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_ref_month DATE;
  v_clients_in NUMERIC := 0;
  v_cash_in NUMERIC := 0;
  v_costs_out NUMERIC := 0;
  v_cash_out NUMERIC := 0;
  v_id UUID;
BEGIN
  v_period_end := date_trunc('month', _reference_date)::DATE + INTERVAL '14 days';
  v_period_start := (date_trunc('month', _reference_date) - INTERVAL '1 month')::DATE + INTERVAL '15 days';
  v_ref_month := date_trunc('month', _reference_date)::DATE;

  -- Entradas: faturas efetivamente pagas no período
  SELECT COALESCE(SUM(amount), 0) INTO v_clients_in
  FROM public.client_invoices
  WHERE status = 'pago'
    AND paid_at BETWEEN v_period_start AND v_period_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_cash_in
  FROM public.cash_entries
  WHERE direction = 'in' AND entry_date BETWEEN v_period_start AND v_period_end;

  WITH pontuais AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM public.costs
    WHERE cost_type = 'pontual'
      AND COALESCE(paid_at, incurred_at) BETWEEN v_period_start AND v_period_end
  ),
  fixos AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM public.costs
    WHERE cost_type = 'fixo'
      AND incurred_at <= v_period_end
      AND CASE COALESCE(recurrence, 'mensal')
        WHEN 'mensal' THEN TRUE
        WHEN 'trimestral' THEN ((EXTRACT(YEAR FROM v_ref_month)::INT - EXTRACT(YEAR FROM incurred_at)::INT) * 12
          + (EXTRACT(MONTH FROM v_ref_month)::INT - EXTRACT(MONTH FROM incurred_at)::INT)) % 3 = 0
        WHEN 'semestral' THEN ((EXTRACT(YEAR FROM v_ref_month)::INT - EXTRACT(YEAR FROM incurred_at)::INT) * 12
          + (EXTRACT(MONTH FROM v_ref_month)::INT - EXTRACT(MONTH FROM incurred_at)::INT)) % 6 = 0
        WHEN 'anual' THEN EXTRACT(MONTH FROM v_ref_month)::INT = EXTRACT(MONTH FROM incurred_at)::INT
        ELSE TRUE
      END
  )
  SELECT (SELECT total FROM pontuais) + (SELECT total FROM fixos) INTO v_costs_out;

  SELECT COALESCE(SUM(amount), 0) INTO v_cash_out
  FROM public.cash_entries
  WHERE direction = 'out' AND entry_date BETWEEN v_period_start AND v_period_end;

  INSERT INTO public.monthly_closings (
    reference_month, period_start, period_end,
    total_in, total_out, net_result,
    clients_in, cash_in, costs_out, cash_out, auto_generated
  ) VALUES (
    v_ref_month, v_period_start, v_period_end,
    v_clients_in + v_cash_in, v_costs_out + v_cash_out,
    (v_clients_in + v_cash_in) - (v_costs_out + v_cash_out),
    v_clients_in, v_cash_in, v_costs_out, v_cash_out, true
  )
  ON CONFLICT (reference_month) DO UPDATE SET
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    total_in = EXCLUDED.total_in,
    total_out = EXCLUDED.total_out,
    net_result = EXCLUDED.net_result,
    clients_in = EXCLUDED.clients_in,
    cash_in = EXCLUDED.cash_in,
    costs_out = EXCLUDED.costs_out,
    cash_out = EXCLUDED.cash_out,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Reprocess history with new rule
DO $$
DECLARE
  d DATE := DATE '2025-03-15';
BEGIN
  WHILE d <= CURRENT_DATE + INTERVAL '1 month' LOOP
    PERFORM public.generate_monthly_closing(d);
    d := (d + INTERVAL '1 month')::date;
  END LOOP;
END $$;

-- 5) Update handle_new_user to not depend on removed CRM tables (already independent, but keep clean)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'comercial');
  RETURN NEW;
END; $function$;

-- 6) NFE email template
INSERT INTO public.email_scripts (key, name, category, subject, body_html, variables_desc, active)
VALUES (
  'nfe_attached',
  'NFE anexada',
  'financeiro',
  'NFE disponível — {{company_name}} — {{reference_month}}',
  '<h2 style="color:#111;margin:0 0 12px;">Olá, {{contact_name}}!</h2>
<p style="color:#333;font-size:15px;line-height:1.55;">A Nota Fiscal referente à mensalidade de <strong>{{reference_month}}</strong> foi emitida e já está disponível.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Empresa</td><td style="padding:8px 12px;background:#fafafa;">{{company_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Referência</td><td style="padding:8px 12px;background:#fafafa;">{{reference_month}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Valor</td><td style="padding:8px 12px;background:#fafafa;">R$ {{amount}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Vencimento</td><td style="padding:8px 12px;background:#fafafa;">{{due_date}}</td></tr>
</table>
<p style="text-align:center;margin:24px 0;">
  <a href="{{nfe_url}}" style="display:inline-block;background:#E10600;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;">Baixar NFE</a>
</p>
<p style="color:#666;font-size:13px;">Qualquer dúvida, estamos à disposição.</p>
<p style="color:#111;margin-top:20px;"><strong>Lupus Assessoria</strong></p>',
  'contact_name, company_name, reference_month, amount, due_date, nfe_url',
  true
)
ON CONFLICT (key) DO NOTHING;
