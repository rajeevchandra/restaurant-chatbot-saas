# Production Webhook Setup

This guide explains how to configure Stripe webhooks for production deployment.

## Overview

In production, Stripe sends webhooks directly to your server's public URL. No Stripe CLI is needed.

## Architecture

```
Customer pays on Stripe Checkout
         ↓
Stripe processes payment
         ↓
Stripe sends webhook → https://yourdomain.com/api/v1/webhooks/stripe
         ↓
Your API verifies signature & updates order status
         ↓
Widget polls and sees order is PAID
```

## Prerequisites

- Production server with public URL (e.g., `https://api.yourdomain.com`)
- SSL certificate (HTTPS required for webhooks)
- Database accessible from production server
- Environment variables configured on server

## Step 1: Deploy Your Application

### Required Environment Variables on Server

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Payment Encryption
PAYMENT_CONFIG_ENC_KEY=your-32-byte-hex-key

# Frontend URL (for payment redirects)
FRONTEND_URL=https://yourdomain.com

# API Port
PORT=3000

# Node Environment
NODE_ENV=production
```

### Deployment Platforms

Choose your platform:

**Option A: Traditional VPS (DigitalOcean, AWS EC2, etc.)**
```bash
# On your server
git clone https://github.com/yourusername/restaurant-chatbot-saas.git
cd restaurant-chatbot-saas
npm install
npm run build
pm2 start apps/api/dist/server.js --name restaurant-api
pm2 startup
pm2 save
```

**Option B: Platform as a Service (Heroku, Railway, Render)**
- Connect GitHub repository
- Set environment variables in dashboard
- Platform auto-deploys on push

**Option C: Container (Docker, Kubernetes)**
```bash
docker-compose up -d
# or
kubectl apply -f kubernetes/
```

## Step 2: Configure Stripe Webhook in Dashboard

1. **Go to Stripe Dashboard**
   - Navigate to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"

2. **Configure Endpoint**
   ```
   Endpoint URL: https://api.yourdomain.com/api/v1/webhooks/stripe
   Description: Production payment webhooks
   API Version: 2023-10-16 (or latest)
   ```

3. **Select Events to Listen**
   
   **Required events:**
   - ✅ `checkout.session.completed` - Payment succeeded
   - ✅ `checkout.session.expired` - Session expired
   - ✅ `charge.succeeded` - Charge completed
   - ✅ `charge.failed` - Charge failed
   
   **Optional (for advanced features):**
   - `charge.refunded` - Payment refunded
   - `payment_intent.succeeded` - Payment intent completed
   - `payment_intent.payment_failed` - Payment intent failed

4. **Get Webhook Signing Secret**
   - After creating the endpoint, click "Reveal" next to "Signing secret"
   - Copy the secret (starts with `whsec_`)
   - **Keep this secret secure!**

## Step 3: Update Production Database with Webhook Secret

### Method A: Using Update Script (Recommended)

1. **SSH into your server** or use your platform's console:
   ```bash
   ssh user@your-server.com
   cd /path/to/restaurant-chatbot-saas/apps/api
   ```

2. **Run update script**:
   ```bash
   node -r @swc-node/register scripts/update-webhook-secret.ts
   # or if using tsx:
   npx tsx scripts/update-webhook-secret.ts
   ```

3. **Enter the webhook secret** when prompted

### Method B: Using SQL (Alternative)

```sql
-- First, get your restaurant ID
SELECT id, name, slug FROM "Restaurant" WHERE slug = 'your-restaurant-slug';

-- Get current payment config
SELECT id, "restaurantId", provider, "isActive" 
FROM "RestaurantPaymentConfig" 
WHERE "restaurantId" = 'your-restaurant-id' AND provider = 'STRIPE';

-- Update webhook secret
UPDATE "RestaurantPaymentConfig"
SET "webhookSecret" = 'whsec_your_production_secret',
    "updatedAt" = NOW()
WHERE "restaurantId" = 'your-restaurant-id' 
  AND provider = 'STRIPE';
```

### Method C: Admin Panel (If Implemented)

Navigate to:
```
https://yourdomain.com/admin/settings/payments
```
Enter webhook secret in the Stripe configuration form.

## Step 4: Restart Production Server

After updating the webhook secret:

```bash
# If using PM2
pm2 restart restaurant-api

# If using systemd
sudo systemctl restart restaurant-api

# If using Docker
docker-compose restart api

# Platform services usually auto-restart
```

## Step 5: Test Production Webhooks

### Test with Real Payment

1. **Create test order** on your production site
2. **Complete payment** with test card (if test mode) or real card
3. **Check logs** for webhook processing:
   ```bash
   # PM2 logs
   pm2 logs restaurant-api
   
   # Docker logs
   docker-compose logs -f api
   
   # Platform logs (check dashboard)
   ```

4. **Verify order status** updated to PAID

### Test with Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Click "Send test webhook"
6. Check your API logs for processing

## Step 6: Monitor Webhooks

### Stripe Dashboard

View webhook delivery logs:
```
Stripe Dashboard → Developers → Webhooks → [Your Endpoint] → Webhook attempts
```

You'll see:
- ✅ Successful deliveries (200 OK)
- ❌ Failed deliveries (4xx, 5xx)
- 🔄 Retry attempts

### Your Application Logs

Check `WebhookEvent` table:
```sql
SELECT 
  id,
  provider,
  "providerEventId",
  "eventType",
  status,
  "createdAt"
FROM "WebhookEvent"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Status values:
- `PROCESSING` - Being processed
- `COMPLETED` - Successfully handled
- `VERIFICATION_FAILED` - Signature verification failed
- `NO_CONFIG` - Payment config not found

## Troubleshooting Production Webhooks

### Webhook Verification Failed

**Symptoms:**
- API returns 400
- Stripe shows "Webhook signature verification failed"

**Solutions:**
1. Verify webhook secret is correct in database
2. Check PAYMENT_CONFIG_ENC_KEY environment variable matches encryption key used
3. Ensure SSL/HTTPS is properly configured
4. Check server time is synchronized (NTP)

**Test decryption:**
```bash
npx tsx scripts/check-payment-config.ts
```

### Webhooks Not Reaching Server

**Symptoms:**
- Stripe shows "Connection timeout"
- No logs in application

**Solutions:**
1. Verify server is publicly accessible:
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. Check firewall rules allow incoming HTTPS (port 443)

3. Verify DNS is correctly configured:
   ```bash
   nslookup api.yourdomain.com
   ```

4. Test webhook endpoint:
   ```bash
   curl -X POST https://api.yourdomain.com/api/v1/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"type": "test"}'
   ```

### Order Status Not Updating

**Symptoms:**
- Webhook received (200 OK)
- Order stays in PAYMENT_PENDING

**Solutions:**

1. **Check webhook event status:**
   ```sql
   SELECT * FROM "WebhookEvent" 
   WHERE status != 'COMPLETED' 
   ORDER BY "createdAt" DESC;
   ```

2. **Check payment status:**
   ```sql
   SELECT o.id, o.status, p.status as payment_status, p."providerPaymentId"
   FROM "Order" o
   JOIN "Payment" p ON p."orderId" = o.id
   WHERE o.status = 'PAYMENT_PENDING'
   ORDER BY o."createdAt" DESC;
   ```

3. **Check API logs** for errors during webhook processing

4. **Manually fix stuck orders** (if needed):
   ```sql
   UPDATE "Order" 
   SET status = 'PAID' 
   WHERE id = 'order-id-here';
   
   UPDATE "Payment" 
   SET status = 'COMPLETED' 
   WHERE "orderId" = 'order-id-here';
   ```

## Security Best Practices

### 1. Always Verify Webhook Signatures

✅ Already implemented in `StripeProvider.verifyWebhook()`

Never trust webhook data without verification:
```typescript
const verificationResult = await paymentProvider.verifyWebhook({
  body: req.body,
  headers: req.headers,
  rawBody: req.rawBody,
});

if (!verificationResult.isValid) {
  return res.status(400).json({ error: 'Invalid signature' });
}
```

### 2. Use HTTPS Only

Stripe requires HTTPS for webhook endpoints. Never use HTTP in production.

### 3. Implement Idempotency

✅ Already implemented - webhooks are tracked in `WebhookEvent` table

Prevents duplicate processing if Stripe retries webhook.

### 4. Rate Limiting

Add rate limiting to webhook endpoints:
```typescript
// In app.ts - already configured
app.use('/api/webhooks', webhookLimiter);
```

### 5. Rotate Webhook Secrets Regularly

Every 90 days:
1. Create new webhook endpoint in Stripe Dashboard
2. Update database with new secret
3. Test new endpoint
4. Delete old endpoint

## Webhook Retry Logic

Stripe automatically retries failed webhooks:

- **1st retry:** After 1 minute
- **2nd retry:** After 30 minutes  
- **3rd retry:** After 2 hours
- Continues for up to 3 days

Your app should:
- ✅ Return 200 OK quickly (within 5 seconds)
- ✅ Use idempotency to handle duplicates
- ✅ Process webhooks asynchronously if needed

## Multi-Environment Setup

### Development
```
Webhook URL: http://localhost:3000/api/v1/webhooks/stripe
Secret: whsec_dev_... (from Stripe CLI)
```

### Staging
```
Webhook URL: https://api-staging.yourdomain.com/api/v1/webhooks/stripe
Secret: whsec_staging_... (from Stripe Dashboard)
```

### Production
```
Webhook URL: https://api.yourdomain.com/api/v1/webhooks/stripe
Secret: whsec_prod_... (from Stripe Dashboard)
```

Each environment should have its own:
- Stripe API keys
- Webhook endpoint
- Webhook secret
- Database

## Monitoring & Alerts

### Set Up Alerts

Monitor for webhook failures:

1. **Application Monitoring** (New Relic, Datadog, etc.):
   ```javascript
   if (webhookStatus === 'VERIFICATION_FAILED') {
     monitoring.alert('Webhook verification failed');
   }
   ```

2. **Database Query** (run every 5 minutes):
   ```sql
   SELECT COUNT(*) 
   FROM "WebhookEvent" 
   WHERE status = 'VERIFICATION_FAILED' 
     AND "createdAt" > NOW() - INTERVAL '1 hour';
   ```

3. **Stripe Dashboard Alerts**:
   - Enable email notifications for failed webhooks
   - Set up Slack integration

### Health Check Endpoint

Monitor webhook processing health:

```typescript
// GET /api/health/webhooks
{
  "stripe": {
    "configured": true,
    "lastSuccessfulWebhook": "2026-01-09T22:30:00Z",
    "recentFailures": 0
  }
}
```

## Rollback Plan

If webhooks stop working:

1. **Check Recent Changes**:
   ```bash
   git log --oneline -10
   ```

2. **Rollback if Needed**:
   ```bash
   git revert HEAD
   pm2 restart restaurant-api
   ```

3. **Temporarily Process Manually**:
   ```sql
   -- Find unpaid orders with completed Stripe payments
   SELECT o.id, p."providerPaymentId" 
   FROM "Order" o
   JOIN "Payment" p ON p."orderId" = o.id
   WHERE o.status = 'PAYMENT_PENDING' 
     AND p."createdAt" > NOW() - INTERVAL '1 hour';
   ```

4. **Check Stripe Dashboard** for payment status

5. **Manually update orders** if payment succeeded

## Summary Checklist

Before going live:

- [ ] Deploy application to production server
- [ ] Configure environment variables
- [ ] Set up SSL/HTTPS certificate
- [ ] Create webhook endpoint in Stripe Dashboard
- [ ] Copy webhook signing secret
- [ ] Update database with webhook secret
- [ ] Restart production server
- [ ] Test with real/test payment
- [ ] Verify webhook delivery in Stripe Dashboard
- [ ] Check order status updates correctly
- [ ] Set up monitoring and alerts
- [ ] Document rollback procedure

## Support

If you encounter issues:

1. Check Stripe webhook logs in Dashboard
2. Check application logs on server
3. Query `WebhookEvent` table for errors
4. Review Stripe API status: https://status.stripe.com
5. Contact Stripe support: https://support.stripe.com
