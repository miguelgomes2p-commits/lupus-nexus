
-- ========== HR MODULE ==========

-- 1) EMPLOYEES
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  payment_day SMALLINT NOT NULL DEFAULT 5,
  pix_key TEXT,
  bank_notes TEXT,
  notes TEXT,
  cost_id UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees read" ON public.employees FOR SELECT USING (true);
CREATE POLICY "employees insert" ON public.employees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "employees update" ON public.employees FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "employees delete" ON public.employees FOR DELETE USING (is_admin_or_gestor(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend costs with link to employee / source marker
ALTER TABLE public.costs ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.costs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_costs_employee ON public.costs(employee_id);

ALTER TABLE public.employees
  ADD CONSTRAINT employees_cost_fk FOREIGN KEY (cost_id) REFERENCES public.costs(id) ON DELETE SET NULL;

-- 3) PAYROLL PAYMENTS (like client_invoices)
CREATE TABLE public.payroll_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente_comprovante',
  receipt_file_path TEXT,
  receipt_file_name TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  paid_at DATE,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, reference_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_payments TO authenticated;
GRANT ALL ON public.payroll_payments TO service_role;

ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll read" ON public.payroll_payments FOR SELECT USING (true);
CREATE POLICY "payroll insert" ON public.payroll_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "payroll update" ON public.payroll_payments FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "payroll delete" ON public.payroll_payments FOR DELETE USING (is_admin_or_gestor(auth.uid()) OR created_by = auth.uid());

CREATE INDEX idx_payroll_employee ON public.payroll_payments(employee_id);
CREATE INDEX idx_payroll_status ON public.payroll_payments(status);
CREATE INDEX idx_payroll_ref ON public.payroll_payments(reference_month);

CREATE TRIGGER payroll_updated_at BEFORE UPDATE ON public.payroll_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Sync cost from employee (insert/update/status change)
CREATE OR REPLACE FUNCTION public.sync_employee_cost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cost_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.costs (description, category, amount, cost_type, recurrence,
                              incurred_at, employee_id, source, notes, created_by)
    VALUES ('Salário — ' || NEW.name || ' (' || NEW.position || ')',
            'Folha', NEW.salary, 'fixo', 'mensal',
            NEW.hire_date, NEW.id, 'payroll',
            'Custo folha gerado automaticamente pelo módulo RH.', NEW.created_by)
    RETURNING id INTO v_cost_id;
    UPDATE public.employees SET cost_id = v_cost_id WHERE id = NEW.id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cost_id IS NOT NULL THEN
      UPDATE public.costs SET
        description = 'Salário — ' || NEW.name || ' (' || NEW.position || ')',
        amount = NEW.salary,
        incurred_at = NEW.hire_date,
        updated_at = now()
      WHERE id = NEW.cost_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_employees_sync_cost
AFTER INSERT OR UPDATE OF name, position, salary, hire_date ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_cost();

-- 5) Refresh closings from payroll_payments (mirrors invoice trigger)
CREATE OR REPLACE FUNCTION public.refresh_closings_from_payroll()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dates date[] := ARRAY[]::date[]; d date; ref date;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.paid_at IS NOT NULL THEN v_dates := array_append(v_dates, NEW.paid_at::date); END IF;
    v_dates := array_append(v_dates, NEW.due_date::date);
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.paid_at IS NOT NULL THEN v_dates := array_append(v_dates, OLD.paid_at::date); END IF;
    v_dates := array_append(v_dates, OLD.due_date::date);
  END IF;

  FOREACH d IN ARRAY v_dates LOOP
    IF EXTRACT(DAY FROM d)::INT <= 15 THEN
      ref := date_trunc('month', d)::date;
    ELSE
      ref := (date_trunc('month', d) + interval '1 month')::date;
    END IF;
    PERFORM public.generate_monthly_closing(ref);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'refresh_closings_from_payroll failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_payroll_refresh_closings
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_closings_from_payroll();

-- 6) Rewrite generate_monthly_closing to (a) skip payroll-source projected fixed costs,
--    (b) count actual paid payroll_payments as outflow in the period.
CREATE OR REPLACE FUNCTION public.generate_monthly_closing(_reference_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Folha efetivamente paga (com comprovante) no período
  SELECT COALESCE(SUM(amount),0) INTO v_payroll_out
  FROM public.payroll_payments
  WHERE status = 'pago' AND paid_at BETWEEN v_period_start AND v_period_end;

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
END; $$;

-- 7) Storage RLS for payroll-receipts bucket (authenticated only)
CREATE POLICY "payroll receipts read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payroll-receipts');
CREATE POLICY "payroll receipts insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payroll-receipts');
CREATE POLICY "payroll receipts update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'payroll-receipts');
CREATE POLICY "payroll receipts delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'payroll-receipts');
