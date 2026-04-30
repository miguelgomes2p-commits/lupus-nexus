ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legal_representative text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS tax_regime text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS monthly_recurring_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS document_notes text;

CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  category text DEFAULT 'documento',
  description text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_documents read" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents insert" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents update" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents delete" ON public.client_documents;

CREATE POLICY "client_documents read"
ON public.client_documents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "client_documents insert"
ON public.client_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "client_documents update"
ON public.client_documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "client_documents delete"
ON public.client_documents
FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON public.client_documents(created_at DESC);

DROP TRIGGER IF EXISTS update_client_documents_updated_at ON public.client_documents;
CREATE TRIGGER update_client_documents_updated_at
BEFORE UPDATE ON public.client_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client documents storage read" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage insert" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage update" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage delete" ON storage.objects;

CREATE POLICY "client documents storage read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "client documents storage insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "client documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "client documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "leads update" ON public.leads;
DROP POLICY IF EXISTS "leads delete" ON public.leads;
CREATE POLICY "leads update"
ON public.leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "leads delete"
ON public.leads
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "clients update" ON public.clients;
DROP POLICY IF EXISTS "clients delete" ON public.clients;
CREATE POLICY "clients update"
ON public.clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "clients delete"
ON public.clients
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "opp update" ON public.opportunities;
DROP POLICY IF EXISTS "opp delete" ON public.opportunities;
CREATE POLICY "opp update"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "opp delete"
ON public.opportunities
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "tasks update" ON public.tasks;
DROP POLICY IF EXISTS "tasks delete" ON public.tasks;
CREATE POLICY "tasks update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "tasks delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "notes manage" ON public.notes;
CREATE POLICY "notes manage"
ON public.notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "contacts manage" ON public.contacts;
CREATE POLICY "contacts manage"
ON public.contacts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "scripts update" ON public.sales_scripts;
DROP POLICY IF EXISTS "scripts delete" ON public.sales_scripts;
CREATE POLICY "scripts update"
ON public.sales_scripts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "scripts delete"
ON public.sales_scripts
FOR DELETE
TO authenticated
USING (true);