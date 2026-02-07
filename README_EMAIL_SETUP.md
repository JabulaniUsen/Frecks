# Email Setup Guide

This project uses Google SMTP (via Gmail) to send transactional emails.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Google SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Frecks <your-email@gmail.com>

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production, use: NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Setting Up Google SMTP

### Step 1: Enable 2-Step Verification

1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "Frecks Email" as the name
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
7. Use this as your `SMTP_PASS` (remove spaces)

### Step 3: Configure Environment Variables

Add the app password to your `.env.local`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop  # The 16-character app password (no spaces)
SMTP_FROM=Frecks <your-email@gmail.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Email Types

### 1. Welcome Email
Sent automatically when a new user signs up.

**Triggered:** User signup (`/app/auth/signup/page.tsx`)

**Contains:**
- Welcome message
- "Browse Events" button
- Branding matching website UI

### 2. Ticket Purchase Email
Sent automatically after successful payment.

**Triggered:** Payment verification (`/app/api/verify-payment/route.ts`)

**Contains:**
- Event details (title, date, location)
- Ticket count
- Total amount
- "See Ticket" button (links to invoice page)
- Important information

## Email Styling

Emails are styled to match the website's design:
- **Primary Color:** `#FF6B00` (Orange)
- **Background:** `#F5F0E8` (Light beige/cream)
- **Font:** Poppins
- **Brand:** Frecks

## Testing

### Test Welcome Email

1. Sign up a new account
2. Check the email inbox for the welcome email

### Test Ticket Email

1. Purchase tickets for an event
2. Complete payment
3. Check the email inbox for the ticket confirmation email
4. Click "See Ticket" button to verify it links to the invoice page

## Troubleshooting

### Error: "Invalid login"
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the password has no spaces

### Error: "Connection timeout"
- Check your internet connection
- Verify `SMTP_HOST` is `smtp.gmail.com`
- Verify `SMTP_PORT` is `587` (or `465` for SSL)

### Emails not sending
- Check server logs for error messages
- Verify all environment variables are set correctly
- Make sure the API route is accessible (`/api/send-email`)

### Emails going to spam
- Use a professional email address (not a personal Gmail if possible)
- Consider setting up SPF/DKIM records for your domain
- Make sure `SMTP_FROM` uses your actual email

## Production Setup

For production, consider:

1. **Use a dedicated email service:**
   - SendGrid
   - Mailgun
   - AWS SES
   - Resend

2. **Update SMTP configuration:**
   ```bash
   SMTP_HOST=smtp.sendgrid.net  # Example for SendGrid
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-api-key
   SMTP_FROM=Frecks <noreply@frecks.com>
   NEXT_PUBLIC_APP_URL=https://frecks.com
   ```

3. **Set up proper DNS records** (SPF, DKIM, DMARC) to improve deliverability

## Package Installation

Make sure `nodemailer` is installed:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

