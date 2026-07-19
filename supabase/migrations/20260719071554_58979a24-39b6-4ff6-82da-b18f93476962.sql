
-- Multiple receipts per payroll payment
CREATE TABLE IF NOT EXISTS public.payroll_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payroll_payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  file_path TEXT,
  file_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_receipts TO authenticated;
GRANT ALL ON public.payroll_receipts TO service_role;
ALTER TABLE public.payroll_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read receipts" ON public.payroll_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert receipts" ON public.payroll_receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update receipts" ON public.payroll_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete receipts" ON public.payroll_receipts FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payroll_receipts_payment ON public.payroll_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payroll_receipts_paid_at ON public.payroll_receipts(paid_at);

CREATE TRIGGER update_payroll_receipts_updated_at
  BEFORE UPDATE ON public.payroll_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute parent payment status/paid_at from receipts
CREATE OR REPLACE FUNCTION public.sync_payroll_payment_from_receipts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment_id UUID := COALESCE(NEW.payment_id, OLD.payment_id);
  v_total NUMERIC;
  v_amount NUMERIC;
  v_max_paid DATE;
  v_last_file TEXT;
  v_last_name TEXT;
  v_new_status TEXT;
BEGIN
  SELECT amount INTO v_amount FROM public.payroll_payments WHERE id = v_payment_id;
  IF v_amount IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount),0), MAX(paid_at) INTO v_total, v_max_paid
    FROM public.payroll_receipts WHERE payment_id = v_payment_id;

  SELECT file_path, file_name INTO v_last_file, v_last_name
    FROM public.payroll_receipts
    WHERE payment_id = v_payment_id AND file_path IS NOT NULL
    ORDER BY paid_at DESC, created_at DESC LIMIT 1;

  IF v_total <= 0 THEN
    v_new_status := 'pendente_comprovante';
  ELSIF v_total + 0.01 < v_amount THEN
    v_new_status := 'parcial';
  ELSE
    v_new_status := 'pago';
  END IF;

  UPDATE public.payroll_payments SET
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'pago' THEN v_max_paid ELSE NULL END,
    receipt_file_path = v_last_file,
    receipt_file_name = v_last_name,
    receipt_uploaded_at = CASE WHEN v_last_file IS NOT NULL THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_payment_id;

  -- Refresh closings for the receipt's month too
  DECLARE d DATE; ref DATE;
  BEGIN
    d := COALESCE(NEW.paid_at, OLD.paid_at);
    IF d IS NOT NULL THEN
      IF EXTRACT(DAY FROM d)::INT <= 15 THEN
        ref := date_trunc('month', d)::date;
      ELSE
        ref := (date_trunc('month', d) + interval '1 month')::date;
      END IF;
      PERFORM public.generate_monthly_closing(ref);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_payroll_receipts_sync
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_receipts
FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_payment_from_receipts();

-- Migrate existing single receipts into the new table
INSERT INTO public.payroll_receipts (payment_id, amount, paid_at, file_path, file_name, created_by, created_at)
SELECT id, amount, COALESCE(paid_at, CURRENT_DATE), receipt_file_path, receipt_file_name, created_by, COALESCE(receipt_uploaded_at, created_at)
FROM public.payroll_payments
WHERE receipt_file_path IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.payroll_receipts r WHERE r.payment_id = payroll_payments.id);

-- Update generate_monthly_closing to use sum of receipts within period
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
  v_payroll_out NUMERIC := 0;
  v_id UUID;
BEGIN
  v_period_end := date_trunc('month', _reference_date)::DATE + INTERVAL '14 days';
  v_period_start := (date_trunc('month', _reference_date) - INTERVAL '1 month')::DATE + INTERVAL '15 days';
  v_ref_month := date_trunc('month', _reference_date)::DATE;

  SELECT COALESCE(SUM(amount),0) INTO v_clients_in
  FROM public.client_invoices
  WHERE status = 'pago' AND paid_at BETWEEN v_period_start AND v_period_end;

  SELECT COALESCE(SUM(amount),0) INTO v_cash_in
  FROM public.cash_entries
  WHERE direction = 'in' AND entry_date BETWEEN v_period_start AND v_period_end;

  WITH pontuais AS (
    SELECT COALESCE(SUM(amount),0) AS total
    FROM public.costs
    WHERE cost_type = 'pontual'
      AND COALESCE(source,'manual') <> 'payroll'
      AND COALESCE(paid_at, incurred_at) BETWEEN v_period_start AND v_period_end
  ),
  fixos AS (
    SELECT COALESCE(SUM(amount),0) AS total
    FROM public.costs
    WHERE cost_type = 'fixo'
      AND COALESCE(source,'manual') <> 'payroll'
      AND incurred_at <= v_period_end
      AND CASE COALESCE(recurrence,'mensal')
        WHEN 'mensal' THEN TRUE
        WHEN 'trimestral' THEN ((EXTRACT(YEAR FROM v_ref_month)::INT - EXTRACT(YEAR FROM incurred_at)::INT)*12
          + (EXTRACT(MONTH FROM v_ref_month)::INT - EXTRACT(MONTH FROM incurred_at)::INT)) % 3 = 0
        WHEN 'semestral' THEN ((EXTRACT(YEAR FROM v_ref_month)::INT - EXTRACT(YEAR FROM incurred_at)::INT)*12
          + (EXTRACT(MONTH FROM v_ref_month)::INT - EXTRACT(MONTH FROM incurred_at)::INT)) % 6 = 0
        WHEN 'anual' THEN EXTRACT(MONTH FROM v_ref_month)::INT = EXTRACT(MONTH FROM incurred_at)::INT
        ELSE TRUE
      END
  )
  SELECT (SELECT total FROM pontuais) + (SELECT total FROM fixos) INTO v_costs_out;

  -- Folha: soma dos comprovantes (receipts) pagos no período
  SELECT COALESCE(SUM(amount),0) INTO v_payroll_out
  FROM public.payroll_receipts
  WHERE paid_at BETWEEN v_period_start AND v_period_end;

  SELECT COALESCE(SUM(amount),0) INTO v_cash_out
  FROM public.cash_entries
  WHERE direction = 'out' AND entry_date BETWEEN v_period_start AND v_period_end;

  INSERT INTO public.monthly_closings (
    reference_month, period_start, period_end,
    total_in, total_out, net_result,
    clients_in, cash_in, costs_out, cash_out, auto_generated
  ) VALUES (
    v_ref_month, v_period_start, v_period_end,
    v_clients_in + v_cash_in,
    v_costs_out + v_cash_out + v_payroll_out,
    (v_clients_in + v_cash_in) - (v_costs_out + v_cash_out + v_payroll_out),
    v_clients_in, v_cash_in, v_costs_out + v_payroll_out, v_cash_out, true
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
END; $function$;
