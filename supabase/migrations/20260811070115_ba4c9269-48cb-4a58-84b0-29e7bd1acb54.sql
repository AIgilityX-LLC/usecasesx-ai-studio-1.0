CREATE POLICY "Workshop members read canvas files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Facilitators upload canvas files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_facilitator(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Facilitators delete canvas files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_facilitator(((storage.foldername(name))[1])::uuid, auth.uid())
);