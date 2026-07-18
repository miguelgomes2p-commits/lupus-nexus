
CREATE OR REPLACE FUNCTION public.generate_monthly_closing(_reference_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Período: dia 16 do mês anterior até dia 15 do mês de referência
  v_period_end := date_trunc('month', _reference_date)::DATE + INTERVAL '14 days';
  v_period_start := (date_trunc('month', _reference_date) - INTERVAL '1 month')::DATE + INTERVAL '15 days';
  v_ref_month := date_trunc('month', _reference_date)::DATE;

  -- Entradas: MRR dos clientes ativos cuja data de contrato caiu dentro do período (proxy p/ recorrência)
  SELECT COALESCE(SUM(COALESCE(monthly_recurring_revenue, 0)), 0)
    INTO v_clients_in
  FROM public.clients
  WHERE status = 'ativo'
    AND contract_start_date IS NOT NULL
    AND EXTRACT(DAY FROM contract_start_date) BETWEEN 1 AND 31;

  -- Refina: soma apenas clientes cuja "data de pagamento" (dia do mês do início do contrato) cai no período
  SELECT COALESCE(SUM(COALESCE(c.monthly_recurring_revenue, 0)), 0)
    INTO v_clients_in
  FROM public.clients c
  WHERE c.status = 'ativo'
    AND c.contract_start_date IS NOT NULL
    AND (
      -- data de pagamento neste mês de referência
      (make_date(EXTRACT(YEAR FROM v_period_end)::INT, EXTRACT(MONTH FROM v_period_end)::INT,
        LEAST(EXTRACT(DAY FROM c.contract_start_date)::INT,
          EXTRACT(DAY FROM (date_trunc('month', v_period_end) + INTERVAL '1 month - 1 day'))::INT))
        BETWEEN v_period_start AND v_period_end)
      OR
      -- data de pagamento no mês anterior
      (make_date(EXTRACT(YEAR FROM v_period_start)::INT, EXTRACT(MONTH FROM v_period_start)::INT,
        LEAST(EXTRACT(DAY FROM c.contract_start_date)::INT,
          EXTRACT(DAY FROM (date_trunc('month', v_period_start) + INTERVAL '1 month - 1 day'))::INT))
        BETWEEN v_period_start AND v_period_end)
    );

  -- Entradas manuais de caixa
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_in
  FROM public.cash_entries
  WHERE direction = 'in' AND entry_date BETWEEN v_period_start AND v_period_end;

  -- Saídas: custos pagos no período
  SELECT COALESCE(SUM(amount), 0) INTO v_costs_out
  FROM public.costs
  WHERE paid = true AND paid_at IS NOT NULL
    AND paid_at BETWEEN v_period_start AND v_period_end;

  -- Saídas manuais de caixa
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
$$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_closing(DATE) TO authenticated;
