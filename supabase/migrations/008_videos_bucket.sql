-- =====================================================
-- STORAGE: videos bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  52428800, -- 50MB (Supabase free tier max)
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/x-m4v', 'video/ogg', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for videos
DROP POLICY IF EXISTS "videos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "videos_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "videos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_owner_delete" ON storage.objects;

CREATE POLICY "videos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "videos_auth_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "videos_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "videos_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
