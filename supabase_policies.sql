-- Supabase Storage Policies for "profile_photos" Bucket
-- Note: Replace "profile_photos" with the actual name of your bucket if it differs.

-- 1. Enable public read access so anyone can view the profile photos
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING ( bucket_id = 'profile_photos' );

-- 2. Allow authenticated users to insert (upload) their own photos
-- The (auth.uid())::text = (storage.foldername(name))[1] ensures
-- users can only upload into a folder named after their own Supabase Auth UID.
-- (This assumes users are logging in via Supabase Auth.)
-- If users are NOT logging in via Supabase Auth but a custom auth system, 
-- use this simpler policy instead:
-- USING ( bucket_id = 'profile_photos' );
CREATE POLICY "Allow Insert for Authenticated Users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'profile_photos' );

-- 3. Allow authenticated users to update their own photos
CREATE POLICY "Allow Update for Authenticated Users"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'profile_photos' );

-- 4. Allow authenticated users to delete their own photos
CREATE POLICY "Allow Delete for Authenticated Users"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'profile_photos' );
