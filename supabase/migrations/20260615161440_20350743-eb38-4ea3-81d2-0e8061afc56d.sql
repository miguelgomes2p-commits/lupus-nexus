
-- LEADS
DROP POLICY IF EXISTS "leads read" ON public.leads;
DROP POLICY IF EXISTS "leads insert" ON public.leads;
DROP POLICY IF EXISTS "leads update" ON public.leads;
DROP POLICY IF EXISTS "leads delete" ON public.leads;
CREATE POLICY "leads read" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- CLIENTS
DROP POLICY IF EXISTS "clients read" ON public.clients;
DROP POLICY IF EXISTS "clients insert" ON public.clients;
DROP POLICY IF EXISTS "clients update" ON public.clients;
DROP POLICY IF EXISTS "clients delete" ON public.clients;
CREATE POLICY "clients read" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients delete" ON public.clients FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- OPPORTUNITIES
DROP POLICY IF EXISTS "opportunities read" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities insert" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities update" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities delete" ON public.opportunities;
CREATE POLICY "opportunities read" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "opportunities insert" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opportunities update" ON public.opportunities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opportunities delete" ON public.opportunities FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- CONTACTS
DROP POLICY IF EXISTS "contacts read" ON public.contacts;
DROP POLICY IF EXISTS "contacts insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts update" ON public.contacts;
DROP POLICY IF EXISTS "contacts delete" ON public.contacts;
CREATE POLICY "contacts read" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contacts update" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contacts delete" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ACTIVITIES
DROP POLICY IF EXISTS "activities read" ON public.activities;
DROP POLICY IF EXISTS "activities insert" ON public.activities;
DROP POLICY IF EXISTS "activities update" ON public.activities;
DROP POLICY IF EXISTS "activities delete" ON public.activities;
CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "activities update" ON public.activities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "activities delete" ON public.activities FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "tasks read" ON public.tasks;
DROP POLICY IF EXISTS "tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks update" ON public.tasks;
DROP POLICY IF EXISTS "tasks delete" ON public.tasks;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- NOTES
DROP POLICY IF EXISTS "notes read" ON public.notes;
DROP POLICY IF EXISTS "notes insert" ON public.notes;
DROP POLICY IF EXISTS "notes update" ON public.notes;
DROP POLICY IF EXISTS "notes delete" ON public.notes;
CREATE POLICY "notes read" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notes update" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "notes delete" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- CLIENT DOCUMENTS
DROP POLICY IF EXISTS "client_documents read" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents insert" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents update" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents delete" ON public.client_documents;
CREATE POLICY "client_documents read" ON public.client_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_documents insert" ON public.client_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "client_documents update" ON public.client_documents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "client_documents delete" ON public.client_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- LEAD TAGS
DROP POLICY IF EXISTS "lead_tags read" ON public.lead_tags;
DROP POLICY IF EXISTS "lead_tags insert" ON public.lead_tags;
DROP POLICY IF EXISTS "lead_tags delete" ON public.lead_tags;
CREATE POLICY "lead_tags read" ON public.lead_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_tags insert" ON public.lead_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lead_tags delete" ON public.lead_tags FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ACTIVITY LOG (histórico)
DROP POLICY IF EXISTS "log read" ON public.activity_log;
DROP POLICY IF EXISTS "log insert" ON public.activity_log;
CREATE POLICY "log read" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "log insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
