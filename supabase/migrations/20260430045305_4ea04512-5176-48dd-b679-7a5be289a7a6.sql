DROP POLICY IF EXISTS "client_documents insert" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents update" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents delete" ON public.client_documents;
CREATE POLICY "client_documents insert"
ON public.client_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "client_documents update"
ON public.client_documents
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "client_documents delete"
ON public.client_documents
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "leads insert" ON public.leads;
DROP POLICY IF EXISTS "leads update" ON public.leads;
DROP POLICY IF EXISTS "leads delete" ON public.leads;
CREATE POLICY "leads insert"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads update"
ON public.leads
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads delete"
ON public.leads
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clients insert" ON public.clients;
DROP POLICY IF EXISTS "clients update" ON public.clients;
DROP POLICY IF EXISTS "clients delete" ON public.clients;
CREATE POLICY "clients insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients update"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients delete"
ON public.clients
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "opp insert" ON public.opportunities;
DROP POLICY IF EXISTS "opp update" ON public.opportunities;
DROP POLICY IF EXISTS "opp delete" ON public.opportunities;
CREATE POLICY "opp insert"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opp update"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opp delete"
ON public.opportunities
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks update" ON public.tasks;
DROP POLICY IF EXISTS "tasks delete" ON public.tasks;
CREATE POLICY "tasks insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notes manage" ON public.notes;
CREATE POLICY "notes manage"
ON public.notes
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "contacts manage" ON public.contacts;
CREATE POLICY "contacts manage"
ON public.contacts
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "scripts insert" ON public.sales_scripts;
DROP POLICY IF EXISTS "scripts update" ON public.sales_scripts;
DROP POLICY IF EXISTS "scripts delete" ON public.sales_scripts;
CREATE POLICY "scripts insert"
ON public.sales_scripts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "scripts update"
ON public.sales_scripts
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "scripts delete"
ON public.sales_scripts
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);