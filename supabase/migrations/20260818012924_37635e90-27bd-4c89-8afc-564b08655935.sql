CREATE TABLE public.organization_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_areas TO authenticated;
GRANT ALL ON public.organization_areas TO service_role;
ALTER TABLE public.organization_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_areas_select" ON public.organization_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_areas_insert" ON public.organization_areas FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "org_areas_update" ON public.organization_areas FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "org_areas_delete" ON public.organization_areas FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));

CREATE TABLE public.organization_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area_id uuid REFERENCES public.organization_areas(id) ON DELETE SET NULL,
  job_title text,
  manager_id uuid REFERENCES public.organization_employees(id) ON DELETE SET NULL,
  email text,
  phone text,
  avatar_path text,
  crm_user_id uuid,
  notes text,
  hire_date date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_employees TO authenticated;
GRANT ALL ON public.organization_employees TO service_role;
ALTER TABLE public.organization_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_employees_select" ON public.organization_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_employees_insert" ON public.organization_employees FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "org_employees_update" ON public.organization_employees FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "org_employees_delete" ON public.organization_employees FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));

CREATE INDEX idx_org_employees_manager ON public.organization_employees(manager_id);
CREATE INDEX idx_org_employees_area ON public.organization_employees(area_id);
CREATE INDEX idx_org_employees_active ON public.organization_employees(is_active);
CREATE INDEX idx_org_areas_active ON public.organization_areas(is_active);

CREATE TRIGGER trg_org_areas_updated BEFORE UPDATE ON public.organization_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_org_employees_updated BEFORE UPDATE ON public.organization_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.prevent_org_cycles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE cur uuid; depth int := 0;
BEGIN
  IF NEW.manager_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Hierarquia circular: funcionário não pode ser superior de si mesmo';
  END IF;
  cur := NEW.manager_id;
  WHILE cur IS NOT NULL AND depth < 200 LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'Hierarquia circular detectada';
    END IF;
    SELECT manager_id INTO cur FROM public.organization_employees WHERE id = cur;
    depth := depth + 1;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_org_employees_no_cycle BEFORE INSERT OR UPDATE OF manager_id
  ON public.organization_employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_org_cycles();

INSERT INTO public.organization_areas (name, color, sort_order) VALUES
  ('Diretoria', '#8b5cf6', 1),
  ('Comercial', '#22c55e', 2),
  ('Marketing', '#f59e0b', 3),
  ('SDR', '#06b6d4', 4),
  ('Atendimento', '#3b82f6', 5),
  ('Financeiro', '#ef4444', 6),
  ('Administrativo', '#64748b', 7),
  ('Operações', '#14b8a6', 8),
  ('Tecnologia', '#6366f1', 9),
  ('RH', '#ec4899', 10),
  ('Pós-venda', '#a855f7', 11);