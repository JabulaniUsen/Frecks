# Ticket QR Code Storage Setup

## Overview

Ticket QR codes are now stored in a Supabase storage bucket called `ticket-qr`. When scanned, the QR code directs users to a validation page where event creators can validate tickets.

## Setup

### 1. Run the Migration

The storage bucket and policies are created via migration:

```bash
# Apply the migration
supabase migration up
```

Or manually in Supabase Dashboard:
1. Go to Storage
2. Create a new bucket named `ticket-qr`
3. Set it to **Public**
4. Apply the RLS policies from `supabase/migrations/006_ticket_qr_bucket.sql`

### 2. How It Works

1. **QR Code Generation**: When an order is created, QR codes are generated as PNG images and uploaded to the `ticket-qr` storage bucket.

2. **QR Code Content**: Each QR code contains a URL pointing to `/ticket/[ticketId]` for validation.

3. **Storage Path**: QR codes are stored at `{userId}/{ticketId}.png` in the bucket.

4. **Validation Page**: When a QR code is scanned, users are directed to `/ticket/[id]` which displays:
   - Ticket details
   - Event information
   - Validation button (only visible to event creators)

5. **Validation**: Event creators can click "Validate Ticket" to mark the ticket as used. This:
   - Updates ticket status to `used`
   - Records `checked_in_at` timestamp
   - Records `checked_in_by` (creator's user ID)
   - Logs the validation in `qr_scans` table

## Features

- ✅ QR codes stored in Supabase storage bucket
- ✅ QR codes contain validation URLs
- ✅ Validation page with ticket details
- ✅ Only event creators can validate tickets
- ✅ Validation status tracking
- ✅ Audit log of all validations

## API Functions

### `generateAndUploadQRCode(data, userId)`
Generates a QR code and uploads it to the storage bucket. Returns the public URL.

### `validateTicket(ticketId, validatedBy)`
Validates a ticket. Only works if `validatedBy` is the event creator.

## Database Schema

Tickets table includes:
- `qr_code`: Validation URL (e.g., `/ticket/{ticketId}`)
- `qr_code_data`: JSONB containing:
  - `qrCodeImageUrl`: Public URL to QR code image in storage
  - `ticketId`, `orderId`, `eventId`: Ticket metadata
- `status`: `'valid' | 'used' | 'cancelled'`
- `checked_in_at`: Timestamp when validated
- `checked_in_by`: User ID of validator

