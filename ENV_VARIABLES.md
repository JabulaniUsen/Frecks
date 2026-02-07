# Required Environment Variables

## Email Configuration (Google SMTP)

Add these to your `.env.local` file for email functionality:

```bash
# Google SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=Frecks <your-email@gmail.com>

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For production, update:**
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Getting Google App Password

1. Enable 2-Step Verification on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use the 16-character password (remove spaces) as `SMTP_PASS`

---

## Complete `.env.local` Template

Here's a complete template with all variables you might need:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key

# Email (Google SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Frecks <your-email@gmail.com>

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Only add variables you need. The email variables are only required if you want to send emails.

