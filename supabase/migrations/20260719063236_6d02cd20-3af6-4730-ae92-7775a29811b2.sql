
CREATE OR REPLACE FUNCTION public.refresh_closings_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dates date[] := ARRAY[]::date[];
  d date;
  ref date;
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
    -- period is (day 16 of prev month) .. (day 15 of current month)
    -- so a date D belongs to reference month = D if day<=15 else D+1 month
    IF EXTRACT(DAY FROM d)::INT <= 15 THEN
      ref := date_trunc('month', d)::date;
    ELSE
      ref := (date_trunc('month', d) + interval '1 month')::date;
    END IF;
    PERFORM public.generate_monthly_closing(ref);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'refresh_closings_from_invoice failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_invoices_refresh_closings ON public.client_invoices;
CREATE TRIGGER trg_invoices_refresh_closings
AFTER INSERT OR UPDATE OR DELETE ON public.client_invoices
FOR EACH ROW EXECUTE FUNCTION public.refresh_closings_from_invoice();

DROP TRIGGER IF EXISTS trg_cash_refresh_closings ON public.cash_entries;
CREATE OR REPLACE FUNCTION public.refresh_closings_from_cash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; ref date;
BEGIN
  d := COALESCE(NEW.entry_date, OLD.entry_date);
  IF EXTRACT(DAY FROM d)::INT <= 15 THEN
    ref := date_trunc('month', d)::date;
  ELSE
    ref := (date_trunc('month', d) + interval '1 month')::date;
  END IF;
  PERFORM public.generate_monthly_closing(ref);
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_cash_refresh_closings
AFTER INSERT OR UPDATE OR DELETE ON public.cash_entries
FOR EACH ROW EXECUTE FUNCTION public.refresh_closings_from_cash();
