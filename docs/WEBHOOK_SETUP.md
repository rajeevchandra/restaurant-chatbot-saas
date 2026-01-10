# Stripe Webhook Setup for Local Testing

This guide shows how to test Stripe webhooks locally using Stripe CLI.

## Prerequisites

- Stripe CLI installed
- API server running on `http://localhost:3000`
- Stripe test account configured (already done via setup-stripe-test.ts)

## Step 1: Install Stripe CLI

### Option A: Using Scoop (Recommended for Windows)
```powershell
# If you don't have Scoop, install it first:
iwr -useb get.scoop.sh | iex

# Add Stripe bucket and install:
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### Option B: Direct Download via PowerShell
```powershell
# Download and extract Stripe CLI
$url = "https://github.com/stripe/stripe-cli/releases/download/v1.19.5/stripe_1.19.5_windows_x86_64.zip"
Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\stripe.zip"
Expand-Archive -Path "$env:TEMP\stripe.zip" -DestinationPath "$env:USERPROFILE\stripe" -Force

# Add to PATH
$env:PATH += ";$env:USERPROFILE\stripe"
[Environment]::SetEnvironmentVariable("Path", "$env:PATH", "User")
```

### Option C: Manual Install
1. Visit: https://github.com/stripe/stripe-cli/releases/latest
2. Download: `stripe_X.X.X_windows_x86_64.zip`
3. Extract to `C:\stripe` or any folder
4. Add folder to your PATH

### Option D: Using Chocolatey
```powershell
choco install stripe-cli
```

### Verify Installation
```powershell
stripe --version
```

## Step 2: Login to Stripe CLI

```powershell
stripe login
```

This will open a browser to authorize the CLI with your Stripe account.

## Step 3: Start Webhook Forwarding

Open a **new terminal** and run:

```powershell
stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**IMPORTANT:** Copy the webhook signing secret (`whsec_xxxxxxxxxxxxx`)

## Step 4: Update Payment Config with Webhook Secret

Run the update script:

```powershell
cd C:\restaurant-chatbot-saas\apps\api
npx tsx scripts/update-webhook-secret.ts
```

When prompted, paste the webhook signing secret from Step 3.

## Step 5: Test the Payment Flow

1. **Start all services** (if not already running):
   ```powershell
   # Terminal 1: API
   cd C:\restaurant-chatbot-saas\apps\api
   npm run dev
   
   # Terminal 2: Widget
   cd C:\restaurant-chatbot-saas\apps\widget
   npm run dev
   
   # Terminal 3: Stripe webhook forwarding
   stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe
   ```

2. **Create an order** in the widget (http://localhost:3002)

3. **Click the payment link** - it opens Stripe Checkout

4. **Complete payment** with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

5. **Watch the webhook terminal** - you should see:
   ```
   2026-01-09 22:00:00  --> checkout.session.completed [evt_xxxxx]
   2026-01-09 22:00:00  <-- [200] POST http://localhost:3000/api/v1/webhooks/stripe
   ```

6. **Check the widget** - order status should update to "PAID" automatically!

## Troubleshooting

### Webhook Secret Not Working

If you see "Webhook verification failed" errors:

1. Make sure you copied the FULL secret including `whsec_`
2. Restart the API server after updating the webhook secret
3. Check the database has the updated secret:
   ```powershell
   npx tsx scripts/check-payment-config.ts
   ```

### Webhooks Not Reaching API

- Ensure API is running on port 3000
- Check the Stripe CLI terminal shows forwarding is active
- Verify firewall isn't blocking localhost connections

### Order Status Not Updating

- Check API logs for errors during webhook processing
- Verify payment was created with correct `providerPaymentId`
- Check `WebhookEvent` table in database for processing status

## Webhook Events

The system handles these Stripe events:

- `checkout.session.completed` - Payment succeeded, updates order to PAID
- `checkout.session.expired` - Payment session expired
- `charge.succeeded` - Additional confirmation of payment
- `charge.failed` - Payment failed, cancels order
- `charge.refunded` - Payment refunded

## Production Setup

For production, instead of Stripe CLI:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/v1/webhooks/stripe`
4. Select events to listen for (at minimum: `checkout.session.completed`)
5. Copy the webhook signing secret
6. Add to production environment variables
7. Update payment config in production database

## Quick Reference

```powershell
# Start webhook forwarding
stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe

# Trigger test webhook (useful for testing)
stripe trigger checkout.session.completed

# View webhook events
stripe events list

# Resend a specific webhook
stripe events resend evt_xxxxx
```
