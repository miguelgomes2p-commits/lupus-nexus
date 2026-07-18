
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

  -- Entradas: MRR dos clientes ativos cuja data de pagamento (dia do contrato) cai no período
  SELECT COALESCE(SUM(COALESCE(c.monthly_recurring_revenue, 0)), 0)
    INTO v_clients_in
  FROM public.clients c
  WHERE c.status = 'ativo'
    AND c.contract_start_date IS NOT NULL
    AND (
      (make_date(EXTRACT(YEAR FROM v_period_end)::INT, EXTRACT(MONTH FROM v_period_end)::INT,
        LEAST(EXTRACT(DAY FROM c.contract_start_date)::INT,
          EXTRACT(DAY FROM (date_trunc('month', v_period_end) + INTERVAL '1 month - 1 day'))::INT))
        BETWEEN v_period_start AND v_period_end)
      OR
      (make_date(EXTRACT(YEAR FROM v_period_start)::INT, EXTRACT(MONTH FROM v_period_start)::INT,
        LEAST(EXTRACT(DAY FROM c.contract_start_date)::INT,
          EXTRACT(DAY FROM (date_trunc('month', v_period_start) + INTERVAL '1 month - 1 day'))::INT))
        BETWEEN v_period_start AND v_period_end)
    );

  SELECT COALESCE(SUM(amount), 0) INTO v_cash_in
  FROM public.cash_entries
  WHERE direction = 'in' AND entry_date BETWEEN v_period_start AND v_period_end;

  -- Saídas: custos pontuais no período (por paid_at se pago, senão incurred_at)
  -- + custos fixos recorrentes contabilizados a cada período conforme sua recorrência
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
