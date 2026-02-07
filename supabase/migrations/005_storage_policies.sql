-- Storage bucket policies for event-images
-- Note: Storage bucket policies need to be created through Supabase Dashboard or CLI
-- This file documents the policies that should be set up

-- Policy: Allow authenticated users to upload images to their own folder
-- Policy name: "Users can upload images to their own folder"
-- Operation: INSERT
-- Target: event-images bucket
-- Policy definition:
--   (bucket_id = 'event-images'::text) AND 
--   (auth.role() = 'authenticated'::text) AND 
--   ((storage.foldername(name))[1] = auth.uid()::text)

-- Policy: Allow public to read images
-- Policy name: "Public can read event images"
-- Operation: SELECT
-- Target: event-images bucket
-- Policy definition:
--   (bucket_id = 'event-images'::text)

-- Policy: Allow users to update/delete their own images
-- Policy name: "Users can manage their own images"
-- Operation: UPDATE, DELETE
-- Target: event-images bucket
-- Policy definition:
--   (bucket_id = 'event-images'::text) AND 
--   (auth.role() = 'authenticated'::text) AND 
--   ((storage.foldername(name))[1] = auth.uid()::text)

-- To set up these policies:
-- 1. Go to Supabase Dashboard > Storage > event-images bucket > Policies
-- 2. Create the policies as described above, OR
-- 3. Use Supabase CLI: supabase storage policies create event-images

-- Alternative: If using Supabase CLI, you can run:
-- supabase storage policies create event-images --policy-name "Users can upload images" --operation INSERT --definition "(bucket_id = 'event-images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = auth.uid()::text)"

