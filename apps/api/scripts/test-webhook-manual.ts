import crypto from 'crypto';
import https from 'https';
import http from 'http';

const WEBHOOK_URL = 'http://localhost:3000/api/v1/webhooks/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_1112373cccf50b20f433d41b6e1a75f08550922fd00c8060f43edaafe4a2c162';

// Sample Stripe checkout.session.completed event
const mockEvent = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_a1AiojqRwAg8UuwQitD6HdxM5XgnozvvsQeD4zgjcMHoKwPJBV5cltsL8Y', // Use actual session ID from your last order
      object: 'checkout.session',
      amount_total: 2160,
      currency: 'usd',
      customer_email: 'test@example.com',
      payment_status: 'paid',
      status: 'complete',
    },
  },
};

// Generate Stripe signature
function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook\n');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Event Type:', mockEvent.type);
  console.log('Session ID:', mockEvent.data.object.id);
  console.log('');

  const payload = JSON.stringify(mockEvent);
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

  console.log('📤 Sending webhook request...\n');

  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Response Status:', res.statusCode, res.statusMessage);
        console.log('📥 Response Body:', data);
        console.log('');

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Webhook processed successfully!');
          resolve(data);
        } else {
          console.log('❌ Webhook failed with status:', res.statusCode);
          console.log('');
          console.log('🔍 Common issues:');
          console.log('  - 400: Signature verification failed or missing data');
          console.log('  - 404: Webhook route not found');
          console.log('  - 500: Server error processing webhook');
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error sending webhook:', error);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

testWebhook().catch(console.error);
