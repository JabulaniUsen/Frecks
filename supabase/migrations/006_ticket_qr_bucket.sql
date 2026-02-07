-- Create the 'ticket-qr' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-qr', 'ticket-qr', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access to ticket QR codes
CREATE POLICY "Allow public read access to ticket QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-qr');

-- Policy for authenticated users to upload ticket QR codes
CREATE POLICY "Allow authenticated users to upload ticket QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-qr' AND auth.uid() = owner);

-- Policy for authenticated users to update ticket QR codes
CREATE POLICY "Allow authenticated users to update ticket QR codes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ticket-qr' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'ticket-qr' AND auth.uid() = owner);

-- Policy for authenticated users to delete ticket QR codes
CREATE POLICY "Allow authenticated users to delete ticket QR codes"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-qr' AND auth.uid() = owner);