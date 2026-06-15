DROP POLICY IF EXISTS "leads delete" ON public.leads;
CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "opportunities delete" ON public.opportunities;
DROP POLICY IF EXISTS "opp delete" ON public.opportunities;
CREATE POLICY "opportunities delete" ON public.opportunities FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);