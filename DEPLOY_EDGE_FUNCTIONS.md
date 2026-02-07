# Deploy Supabase Edge Functions

The error "Failed to send a request to the Edge Function" occurs because the Edge Functions are not deployed yet.

## Quick Fix

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link your project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 4. Set Paystack Secret Key

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key_here
```

For production, use your live key:
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
```

### 5. Deploy Edge Functions

Deploy both functions:

```bash
# Deploy the function to get banks list
supabase functions deploy get-paystack-banks

# Deploy the function to verify bank accounts
supabase functions deploy verify-bank-account
```

### 6. Verify Deployment

After deployment, you should see:
- ✅ Function deployed successfully
- The functions will be available at:
  - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-paystack-banks`
  - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-bank-account`

## Troubleshooting

### Error: "Function not found"
- Make sure you've deployed the function: `supabase functions deploy get-paystack-banks`
- Check that you're linked to the correct project: `supabase projects list`

### Error: "Failed to send a request"
- Check your internet connection
- Verify your Supabase project URL is correct in `.env.local`
- Make sure the function is deployed: Check in Supabase Dashboard > Edge Functions

### Error: "Paystack secret key not configured"
- Set the secret: `supabase secrets set PAYSTACK_SECRET_KEY=your_key`
- Verify it's set: `supabase secrets list`

## Testing Locally (Optional)

You can test Edge Functions locally before deploying:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve get-paystack-banks --env-file .env.local
```

## After Deployment

Once deployed, the bank verification feature will work automatically. The app will:
1. Fetch the list of Nigerian banks from Paystack
2. Allow users to verify their bank account numbers
3. Auto-fill the verified account name

