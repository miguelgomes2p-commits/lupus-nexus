-- Tabela de custos
CREATE TABLE public.costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL DEFAULT 'pontual', -- 'fixo' | 'pontual'
  recurrence TEXT, -- 'mensal' | 'trimestral' | 'anual' (quando fixo)
  incurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at DATE,
  vendor TEXT,
  payment_method TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costs read" ON public.costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "costs insert" ON public.costs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "costs update" ON public.costs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "costs delete" ON public.costs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_costs_updated_at
BEFORE UPDATE ON public.costs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_costs_incurred_at ON public.costs(incurred_at DESC);
CREATE INDEX idx_costs_type ON public.costs(cost_type);