/*
# Add uploaded profile photos

1. Modified tables
- `profiles`: new column `avatar_url` (text, optional). Holds the public address of a photo the user uploaded. Empty when the user picks one of the preset avatars.

2. New storage
- `avatars` bucket: public image bucket, 2 MB limit per file, only JPEG, PNG and WebP.

3. Security
- Only the signed-in owner can upload, replace or delete files inside their own folder (named after their account id).
- Nobody can list the bucket; files are reachable only by their direct address.
- Column-level write grant on profiles is extended to `avatar_url` only. Role stays read-only for owners.

4. Notes
- Idempotent: safe to run again.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);

GRANT UPDATE (display_name, avatar_key, avatar_url, christmas_emoji) ON profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
CREATE POLICY "avatars_insert_own_folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own_folder" ON storage.objects;
CREATE POLICY "avatars_update_own_folder" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;
CREATE POLICY "avatars_delete_own_folder" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
