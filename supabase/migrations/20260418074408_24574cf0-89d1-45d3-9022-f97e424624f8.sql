-- Enums para categorias e abordagens
CREATE TYPE public.script_category AS ENUM (
  'prospeccao',
  'qualificacao',
  'apresentacao',
  'objecoes',
  'fechamento',
  'follow_up',
  'reativacao'
);

CREATE TYPE public.script_approach AS ENUM (
  'cold_call',
  'whatsapp',
  'email',
  'reuniao',
  'linkedin',
  'indicacao'
);

-- Tabela de scripts de vendas
CREATE TABLE public.sales_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category public.script_category NOT NULL DEFAULT 'prospeccao',
  approach public.script_approach NOT NULL DEFAULT 'cold_call',
  content TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_sales_scripts_category ON public.sales_scripts(category);
CREATE INDEX idx_sales_scripts_approach ON public.sales_scripts(approach);
CREATE INDEX idx_sales_scripts_author ON public.sales_scripts(author_id);
CREATE INDEX idx_sales_scripts_active ON public.sales_scripts(is_active);

-- RLS
ALTER TABLE public.sales_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scripts read"
  ON public.sales_scripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "scripts insert"
  ON public.sales_scripts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "scripts update"
  ON public.sales_scripts FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_gestor(auth.uid())
    OR author_id = auth.uid()
  );

CREATE POLICY "scripts delete"
  ON public.sales_scripts FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_gestor(auth.uid())
    OR author_id = auth.uid()
  );

-- Trigger updated_at
CREATE TRIGGER trg_sales_scripts_updated_at
  BEFORE UPDATE ON public.sales_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();