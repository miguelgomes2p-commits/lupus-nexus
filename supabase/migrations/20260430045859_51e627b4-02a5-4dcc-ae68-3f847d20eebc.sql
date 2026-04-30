DROP POLICY IF EXISTS "client documents storage read" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage insert" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage update" ON storage.objects;
DROP POLICY IF EXISTS "client documents storage delete" ON storage.objects;

CREATE POLICY "client documents storage read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "client documents storage insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "client documents storage update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "client documents storage delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);