# Storage Bucket Setup for Event Images

## Overview
Event images are stored in a Supabase Storage bucket called `event-images`. This guide will help you set up the bucket and configure the necessary policies.

## Setup Instructions

### Option 1: Using SQL Migration (Recommended)

1. **Run the migration file:**
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or run the SQL directly in Supabase Dashboard:
   # Go to SQL Editor → Run the contents of supabase/migrations/005_storage_bucket.sql
   ```

### Option 2: Manual Setup via Supabase Dashboard

1. **Create the Storage Bucket:**
   - Go to your Supabase Dashboard
   - Navigate to **Storage** → **Buckets**
   - Click **New bucket**
   - Name: `event-images`
   - Public bucket: **Yes** (checked)
   - Click **Create bucket**

2. **Set up Storage Policies:**
   - Go to **Storage** → **Policies** → `event-images`
   - Add the following policies:

   **Policy 1: Allow authenticated users to upload**
   ```sql
   CREATE POLICY "Authenticated users can upload event images"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'event-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 2: Allow users to update their own images**
   ```sql
   CREATE POLICY "Users can update their own event images"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'event-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   )
   WITH CHECK (
     bucket_id = 'event-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 3: Allow users to delete their own images**
   ```sql
   CREATE POLICY "Users can delete their own event images"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'event-images' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 4: Allow public to read images**
   ```sql
   CREATE POLICY "Public can read event images"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'event-images');
   ```

## How It Works

- **Image Upload:** When a creator uploads an event image, it's stored in the `event-images` bucket
- **File Path:** Images are stored as `{user_id}/{timestamp}.jpg`
- **Public Access:** Images are publicly accessible via their URL
- **Security:** Users can only upload/update/delete their own images (based on folder structure)

## Troubleshooting

### Error: "Bucket not found"
- Make sure the `event-images` bucket exists in your Supabase Storage
- Check the bucket name matches exactly: `event-images`

### Error: "Permission denied" or "new row violates row-level security"
- Ensure storage policies are set up correctly
- Check that the bucket is set to public
- Verify the user is authenticated

### Images not displaying
- Check that the bucket is public
- Verify the `getPublicUrl` function is working
- Check browser console for CORS errors

## Testing

After setup, try creating an event with an image:
1. Go to `/dashboard/creator/create`
2. Upload an image in Step 1
3. Complete the event creation
4. Check that the image displays on the home page

If you see an error, check:
- Browser console for detailed error messages
- Supabase Storage logs
- Network tab to see if the upload request is being made
