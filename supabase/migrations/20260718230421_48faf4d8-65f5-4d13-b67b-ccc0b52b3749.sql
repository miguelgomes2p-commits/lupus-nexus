
CREATE TABLE public.cash_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  category TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_entries all authenticated" ON public.cash_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_cash_entries_updated_at BEFORE UPDATE ON public.cash_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.monthly_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_month DATE NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_in NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_out NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_result NUMERIC(14,2) NOT NULL DEFAULT 0,
  clients_in NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_in NUMERIC(14,2) NOT NULL DEFAULT 0,
  costs_out NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_out NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_closings TO authenticated;
GRANT ALL ON public.monthly_closings TO service_role;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_closings all authenticated" ON public.monthly_closings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_monthly_closings_updated_at BEFORE UPDATE ON public.monthly_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
