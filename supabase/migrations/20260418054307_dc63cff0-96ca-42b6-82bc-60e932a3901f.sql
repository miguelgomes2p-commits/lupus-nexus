-- ============================================================
-- LUPUS CRM — schema completo
-- ============================================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'comercial');
CREATE TYPE public.lead_status AS ENUM ('novo', 'contatado', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido', 'descartado');
CREATE TYPE public.lead_temperature AS ENUM ('frio', 'morno', 'quente');
CREATE TYPE public.priority_level AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE public.opportunity_status AS ENUM ('aberta', 'ganha', 'perdida');
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE public.client_status AS ENUM ('ativo', 'inativo', 'pausado');
CREATE TYPE public.activity_type AS ENUM ('lead_criado','lead_editado','lead_convertido','oportunidade_criada','oportunidade_movida','oportunidade_ganha','oportunidade_perdida','tarefa_criada','tarefa_concluida','nota_criada','cliente_criado','responsavel_alterado','status_alterado','etapa_alterada','contato_registrado');

-- ============= updated_at helper =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor'));
$$;

-- Trigger: on signup -> create profile + comercial role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= SOURCES =============
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_sources_updated BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= TAGS =============
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#E10600',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_tags_updated BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= PIPELINE STAGES =============
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#E10600',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_stages_updated BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= LEADS =============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  status public.lead_status NOT NULL DEFAULT 'novo',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  temperature public.lead_temperature NOT NULL DEFAULT 'frio',
  priority public.priority_level NOT NULL DEFAULT 'media',
  estimated_value NUMERIC(14,2) DEFAULT 0,
  cnpj TEXT,
  instagram TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE TRIGGER tg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= CLIENTS =============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cnpj TEXT,
  segment TEXT,
  status public.client_status NOT NULL DEFAULT 'ativo',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contract_value NUMERIC(14,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_owner ON public.clients(owner_id);
CREATE TRIGGER tg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= CONTACTS =============
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= OPPORTUNITIES =============
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  status public.opportunity_status NOT NULL DEFAULT 'aberta',
  probability INT NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_close_date DATE,
  lost_reason TEXT,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_moved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_opp_owner ON public.opportunities(owner_id);
CREATE INDEX idx_opp_stage ON public.opportunities(stage_id);
CREATE TRIGGER tg_opp_updated BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= TASKS =============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  related_lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  related_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  related_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.task_status NOT NULL DEFAULT 'pendente',
  priority public.priority_level NOT NULL DEFAULT 'media',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE TRIGGER tg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= ACTIVITIES =============
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.activity_type NOT NULL,
  description TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activities_created ON public.activities(created_at DESC);
CREATE INDEX idx_activities_lead ON public.activities(lead_id);
CREATE INDEX idx_activities_opp ON public.activities(opportunity_id);

-- ============= NOTES =============
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= LEAD_TAGS =============
CREATE TABLE public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, tag_id)
);
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- ============= NOTIFICATIONS =============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notifications(user_id);

-- ============= SETTINGS =============
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= ACTIVITY_LOG =============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_log_entity ON public.activity_log(entity_type, entity_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- Strategy: any authenticated user can read/write CRM data;
-- admins/gestores have additional management privileges.
-- (Aligned with collaborative team workflow.)

-- profiles
CREATE POLICY "profiles read all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles admin update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "roles read all auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- generic policy creator helper via inline definitions
-- sources / tags / pipeline_stages: read all, manage admin/gestor
CREATE POLICY "sources read" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "sources manage" ON public.sources FOR ALL TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "tags read" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags manage" ON public.tags FOR ALL TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "stages read" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "stages manage" ON public.pipeline_stages FOR ALL TO authenticated USING (public.is_admin_or_gestor(auth.uid())) WITH CHECK (public.is_admin_or_gestor(auth.uid()));

-- leads / clients / contacts / opportunities / tasks / activities / notes / lead_tags
-- Authenticated users can read all; insert/update/delete: admin/gestor or owner
CREATE POLICY "leads read" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "clients read" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "clients delete" ON public.clients FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "contacts read" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts manage" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "opp read" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "opp insert" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "opp update" ON public.opportunities FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "opp delete" ON public.opportunities FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY "tasks delete" ON public.tasks FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()) OR assigned_to = auth.uid());

CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notes read" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes manage" ON public.notes FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())) WITH CHECK (true);

CREATE POLICY "lead_tags read" ON public.lead_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_tags manage" ON public.lead_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "settings read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings manage" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "log read" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "log insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Seed mínimo: etapas padrão do pipeline
-- ============================================================
INSERT INTO public.pipeline_stages (name, order_index, color) VALUES
('Novo Lead', 1, '#9CA3AF'),
('Qualificação', 2, '#3B82F6'),
('Proposta', 3, '#F59E0B'),
('Negociação', 4, '#E10600'),
('Fechamento', 5, '#10B981');

INSERT INTO public.sources (name, description) VALUES
('Indicação', 'Cliente indicado'),
('Instagram', 'Lead via Instagram'),
('Site', 'Formulário do site'),
('WhatsApp', 'Contato direto via WhatsApp'),
('Prospecção Ativa', 'Outbound da equipe');

INSERT INTO public.tags (name, color) VALUES
('VIP', '#E10600'),
('Recorrente', '#10B981'),
('Alto Valor', '#F59E0B');
