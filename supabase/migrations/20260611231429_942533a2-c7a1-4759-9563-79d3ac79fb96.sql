
-- =========================================================
-- Helper functions for access checks
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_access_lead(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND (l.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (c.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_opportunity(_opp_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = _opp_id
      AND (o.owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  );
$$;

-- Lock down EXECUTE on security definer helpers to authenticated only (not anon/public)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_gestor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_lead(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_client(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_opportunity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gestor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_opportunity(uuid) TO authenticated;

-- =========================================================
-- LEADS
-- =========================================================
DROP POLICY IF EXISTS "leads read" ON public.leads;
DROP POLICY IF EXISTS "leads insert" ON public.leads;
DROP POLICY IF EXISTS "leads update" ON public.leads;
DROP POLICY IF EXISTS "leads delete" ON public.leads;

CREATE POLICY "leads read" ON public.leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- CLIENTS
-- =========================================================
DROP POLICY IF EXISTS "clients read" ON public.clients;
DROP POLICY IF EXISTS "clients insert" ON public.clients;
DROP POLICY IF EXISTS "clients update" ON public.clients;
DROP POLICY IF EXISTS "clients delete" ON public.clients;

CREATE POLICY "clients read" ON public.clients FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "clients delete" ON public.clients FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- OPPORTUNITIES
-- =========================================================
DROP POLICY IF EXISTS "opp read" ON public.opportunities;
DROP POLICY IF EXISTS "opp insert" ON public.opportunities;
DROP POLICY IF EXISTS "opp update" ON public.opportunities;
DROP POLICY IF EXISTS "opp delete" ON public.opportunities;

CREATE POLICY "opp read" ON public.opportunities FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  );
CREATE POLICY "opp insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "opp update" ON public.opportunities FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "opp delete" ON public.opportunities FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- CONTACTS
-- =========================================================
DROP POLICY IF EXISTS "contacts read" ON public.contacts;
DROP POLICY IF EXISTS "contacts manage" ON public.contacts;

CREATE POLICY "contacts read" ON public.contacts FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  );
CREATE POLICY "contacts insert" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  );
CREATE POLICY "contacts update" ON public.contacts FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  )
  WITH CHECK (
    public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  );
CREATE POLICY "contacts delete" ON public.contacts FOR DELETE TO authenticated
  USING (
    public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
  );

-- =========================================================
-- NOTES
-- =========================================================
DROP POLICY IF EXISTS "notes read" ON public.notes;
DROP POLICY IF EXISTS "notes manage" ON public.notes;

CREATE POLICY "notes read" ON public.notes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
    OR (opportunity_id IS NOT NULL AND public.can_access_opportunity(opportunity_id))
  );
CREATE POLICY "notes insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      public.is_admin_or_gestor(auth.uid())
      OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
      OR (client_id IS NOT NULL AND public.can_access_client(client_id))
      OR (opportunity_id IS NOT NULL AND public.can_access_opportunity(opportunity_id))
    )
  );
CREATE POLICY "notes update" ON public.notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "notes delete" ON public.notes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- TASKS
-- =========================================================
DROP POLICY IF EXISTS "tasks read" ON public.tasks;
DROP POLICY IF EXISTS "tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks update" ON public.tasks;
DROP POLICY IF EXISTS "tasks delete" ON public.tasks;

CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "tasks insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (assigned_to = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (assigned_to = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "tasks delete" ON public.tasks FOR DELETE TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- ACTIVITIES
-- =========================================================
DROP POLICY IF EXISTS "activities read" ON public.activities;
DROP POLICY IF EXISTS "activities insert" ON public.activities;

CREATE POLICY "activities read" ON public.activities FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_gestor(auth.uid())
    OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_access_client(client_id))
    OR (opportunity_id IS NOT NULL AND public.can_access_opportunity(opportunity_id))
  );
CREATE POLICY "activities insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- ACTIVITY_LOG (audit trail - admin/gestor only for reads)
-- =========================================================
DROP POLICY IF EXISTS "log read" ON public.activity_log;
DROP POLICY IF EXISTS "log insert" ON public.activity_log;

CREATE POLICY "log read" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "log insert" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- COSTS (financial - admin/gestor only)
-- =========================================================
DROP POLICY IF EXISTS "costs read" ON public.costs;
DROP POLICY IF EXISTS "costs insert" ON public.costs;
DROP POLICY IF EXISTS "costs update" ON public.costs;
DROP POLICY IF EXISTS "costs delete" ON public.costs;

CREATE POLICY "costs read" ON public.costs FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "costs insert" ON public.costs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "costs update" ON public.costs FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "costs delete" ON public.costs FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

-- =========================================================
-- CLIENT_DOCUMENTS
-- =========================================================
DROP POLICY IF EXISTS "client_documents read" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents insert" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents update" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents delete" ON public.client_documents;

CREATE POLICY "client_documents read" ON public.client_documents FOR SELECT TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR public.can_access_client(client_id));
CREATE POLICY "client_documents insert" ON public.client_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      public.is_admin_or_gestor(auth.uid()) OR public.can_access_client(client_id)
    )
  );
CREATE POLICY "client_documents update" ON public.client_documents FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR public.can_access_client(client_id))
  WITH CHECK (public.is_admin_or_gestor(auth.uid()) OR public.can_access_client(client_id));
CREATE POLICY "client_documents delete" ON public.client_documents FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()) OR public.can_access_client(client_id));

-- =========================================================
-- STORAGE: client-documents bucket
-- =========================================================
DROP POLICY IF EXISTS "client-docs read" ON storage.objects;
DROP POLICY IF EXISTS "client-docs insert" ON storage.objects;
DROP POLICY IF EXISTS "client-docs update" ON storage.objects;
DROP POLICY IF EXISTS "client-docs delete" ON storage.objects;

CREATE POLICY "client-docs read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents' AND (
      public.is_admin_or_gestor(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.client_documents cd
        WHERE cd.file_path = storage.objects.name
          AND public.can_access_client(cd.client_id)
      )
    )
  );
CREATE POLICY "client-docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "client-docs update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents' AND (
      public.is_admin_or_gestor(auth.uid()) OR owner = auth.uid()
    )
  );
CREATE POLICY "client-docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents' AND (
      public.is_admin_or_gestor(auth.uid()) OR owner = auth.uid()
    )
  );

-- =========================================================
-- LEAD_TAGS (fix always-true RLS)
-- =========================================================
DROP POLICY IF EXISTS "lead_tags read" ON public.lead_tags;
DROP POLICY IF EXISTS "lead_tags manage" ON public.lead_tags;

CREATE POLICY "lead_tags read" ON public.lead_tags FOR SELECT TO authenticated
  USING (public.can_access_lead(lead_id));
CREATE POLICY "lead_tags insert" ON public.lead_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_access_lead(lead_id));
CREATE POLICY "lead_tags delete" ON public.lead_tags FOR DELETE TO authenticated
  USING (public.can_access_lead(lead_id));

-- =========================================================
-- NOTIFICATIONS (restrict who can create)
-- =========================================================
DROP POLICY IF EXISTS "notif insert" ON public.notifications;
CREATE POLICY "notif insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_gestor(auth.uid()));
