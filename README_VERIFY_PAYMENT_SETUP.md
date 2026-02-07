# Payment Verification Edge Function Setup

## ⚠️ IMPORTANT: CORS Error Fix

The error "Failed to send a request to the Edge Function" or CORS errors typically mean:
1. **The function is not deployed yet** (most common)
2. The function needs proper CORS headers (already fixed in code)
3. Environment variables are not set

## Why NOT Client-Side Verification?

**⚠️ NEVER verify payments client-side!** Here's why:
- Security risk: Users can manipulate client-side code
- Payment status can be faked
- No server-side validation means fraud is possible
- Industry standard requires server-side verification

## Deployment Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project (get project ref from Supabase dashboard URL)
# Example: https://ynkvvjkokwwnqoujeznu.supabase.co -> project ref is "ynkvvjkokwwnqoujeznu"
supabase link --project-ref ynkvvjkokwwnqoujeznu
```

### 3. Set Environment Variables

```bash
# Set Paystack secret key
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key_here

# Set Supabase service role key (get from Supabase dashboard -> Settings -> API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Supabase URL is automatically available, but you can also set it explicitly
supabase secrets set SUPABASE_URL=https://ynkvvjkokwwnqoujeznu.supabase.co
```

### 4. Deploy the Function

```bash
# Navigate to project root
cd /Users/mac/Desktop/frecks-new

# Deploy the verify-payment function
supabase functions deploy verify-payment
```

### 5. Verify Deployment

After deployment, you should see:
```
✅ Function deployed successfully
Deployed Function URL: https://ynkvvjkokwwnqoujeznu.supabase.co/functions/v1/verify-payment
```

## Testing

1. Test the function directly:
```bash
curl -X POST https://ynkvvjkokwwnqoujeznu.supabase.co/functions/v1/verify-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"orderId":"test-order-id","paystackReference":"test-ref"}'
```

2. Test OPTIONS (CORS preflight):
```bash
curl -X OPTIONS https://ynkvvjkokwwnqoujeznu.supabase.co/functions/v1/verify-payment \
  -H "Origin: http://localhost:3000" \
  -v
```

## Troubleshooting

### CORS Error Still Appearing?

1. **Check if function is deployed:**
   - Go to Supabase Dashboard -> Edge Functions
   - Verify `verify-payment` appears in the list

2. **Check function logs:**
   ```bash
   supabase functions logs verify-payment
   ```

3. **Verify environment variables:**
   ```bash
   supabase secrets list
   ```

### Function Not Found Error?

- Make sure you've deployed the function
- Check the function name matches exactly: `verify-payment`
- Verify you're using the correct project reference

### Permission Denied?

- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Service role key has admin access to update orders
- Check RLS policies allow the service role to update orders

## Alternative: Use Next.js API Route (If Edge Functions Don't Work)

If you continue having issues with edge functions, you can create a Next.js API route instead:

1. Create `app/api/verify-payment/route.ts`
2. Move the verification logic there
3. Use server-side Paystack API calls
4. Update `src/lib/paystack.ts` to call `/api/verify-payment` instead

However, **edge functions are preferred** because they:
- Run closer to users (lower latency)
- Scale automatically
- Don't consume your Next.js server resources

