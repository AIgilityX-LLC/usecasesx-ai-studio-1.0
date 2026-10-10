CREATE POLICY "benefit evidence read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "benefit evidence insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "benefit evidence update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "benefit evidence delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
