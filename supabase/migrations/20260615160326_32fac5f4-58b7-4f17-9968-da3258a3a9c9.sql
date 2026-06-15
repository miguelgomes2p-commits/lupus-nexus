DROP POLICY IF EXISTS "costs read" ON public.costs;
DROP POLICY IF EXISTS "costs insert" ON public.costs;
DROP POLICY IF EXISTS "costs update" ON public.costs;
DROP POLICY IF EXISTS "costs delete" ON public.costs;

CREATE POLICY "costs read" ON public.costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "costs insert" ON public.costs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "costs update" ON public.costs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "costs delete" ON public.costs FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin_or_gestor(auth.uid()));