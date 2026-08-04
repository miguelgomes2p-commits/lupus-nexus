DROP POLICY IF EXISTS "settings read" ON public.settings;
CREATE POLICY "settings read" ON public.settings FOR SELECT TO authenticated
USING (key NOT LIKE 'secret_%' OR has_role(auth.uid(), 'admin'::app_role));