
CREATE POLICY "own problem images select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='problem-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own problem images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='problem-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own problem images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='problem-images' AND (storage.foldername(name))[1] = auth.uid()::text);
