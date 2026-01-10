# Stripe Test Payment Setup Guide

## Quick Setup Steps

### 1. Get Stripe Test Keys

1. Sign up at https://stripe.com (free account)
2. Ensure **Test mode** is ON (toggle in top-left corner)
3. Go to **Developers** → **API keys**: https://dashboard.stripe.com/test/apikeys
4. Copy your keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

### 2. Configure Your Restaurant

**Option A: Using the Setup Script (Recommended)**

1. Edit `apps/api/scripts/setup-stripe-test.ts`:
   ```typescript
   const STRIPE_SECRET_KEY = 'sk_test_51ABC...'; // Your actual key
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_51ABC...'; // Your actual key
   ```

2. Run the script:
   ```bash
   cd apps/api
   npx tsx scripts/setup-stripe-test.ts
   ```

**Option B: Via Admin Panel (Manual)**

1. Login to admin panel: http://localhost:3001/login
2. Go to **Settings** → **Payments**
3. Click **Add Payment Provider**
4. Select **Stripe** and enter your test keys
5. Save and activate

### 3. Test the Payment Flow

1. Open the widget: http://localhost:3002
2. Add items to cart and checkout
3. You'll see a Stripe Checkout payment link
4. Click to open Stripe's secure payment page

### 4. Test Credit Cards (Stripe Test Mode)

Stripe provides test cards that simulate different scenarios:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Card Declined:**
- Card: `4000 0000 0000 0002`

**Insufficient Funds:**
- Card: `4000 0000 0000 9995`

**3D Secure Authentication:**
- Card: `4000 0025 0000 3155`

More test cards: https://stripe.com/docs/testing

### 5. Webhook Setup (Optional - For Production)

For local testing, webhooks aren't required, but for production:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Copy the webhook signing secret (`whsec_...`)
4. Add to your payment config

## Environment Variables

Add to your `.env` file (optional, for webhook verification):

```env
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3002
```

## Troubleshooting

### "Payment provider not configured"
- Make sure you ran the setup script with valid keys
- Check that `isActive` is `true` in the database
- Restart the API server

### No checkout URL in response
- Verify your Stripe keys are correct
- Check API logs for payment errors
- Ensure test mode is enabled in Stripe

### Payment completed but order not updated
- Set up webhooks (see step 5 above)
- Or manually test webhook events in Stripe Dashboard

## Verify Configuration

Check if configuration exists:
```bash
cd apps/api
npx prisma studio
```

Navigate to `RestaurantPaymentConfig` table and verify:
- `provider` = "STRIPE"
- `isActive` = true
- `encryptedSecretKey` exists

## Production Checklist

Before going live:
1. Switch Stripe to **Live mode**
2. Get live API keys (`sk_live_...` and `pk_live_...`)
3. Set up live webhooks with proper endpoint URL
4. Enable required payment methods
5. Complete Stripe account verification
6. Test with small real transactions

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Dashboard: https://dashboard.stripe.com
- Test Cards: https://stripe.com/docs/testing
