# Paystack Bank Account Verification Setup

## Overview
The application uses Paystack's bank account verification API to verify Nigerian bank accounts before saving them to the database.

## ⚠️ IMPORTANT: Deploy Edge Functions First

**The error "Failed to send a request to the Edge Function" means the functions are not deployed yet.**

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project (get project ref from Supabase dashboard URL)
supabase link --project-ref your-project-ref
```

### 3. Set the Paystack Secret Key

```bash
# For testing (use test key)
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key_here

# For production (use live key)
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
```

### 4. Deploy Edge Functions

**You MUST deploy both functions:**

```bash
# Deploy function to get banks list
supabase functions deploy get-paystack-banks

# Deploy function to verify bank accounts
supabase functions deploy verify-bank-account
```

After deployment, you should see:
- ✅ Function deployed successfully
- Functions available at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/function-name`

### 2. Environment Variables

Make sure you have your Paystack keys in your `.env.local` file:
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
```

### 3. How It Works

1. **User enters bank details** in the Settings page
2. **User clicks "Verify" button** - This calls the Paystack API to resolve the account number
3. **Account name is returned** - The API returns the account name associated with the account number
4. **Account name is auto-filled** - If verification succeeds, the account name is automatically filled
5. **On save** - The account is verified again before saving, and `is_bank_verified` is set to `true`

### 4. API Endpoints Used

- **Resolve Account Number**: `GET /bank/resolve`
  - Verifies that the account number and bank code match
  - Returns the account name
  - Free for Nigerian banks

### 5. Error Handling

The system handles various error cases:
- Invalid account number
- Invalid bank code
- Account not found
- Network errors
- Account name mismatch

### 6. Security

- The Paystack secret key is stored securely in Supabase secrets
- The verification happens server-side via Edge Function
- Only verified accounts are saved with `is_bank_verified: true`

