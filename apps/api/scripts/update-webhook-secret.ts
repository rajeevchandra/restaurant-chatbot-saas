import { config } from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline';

// Load environment variables from root .env
config({ path: resolve(__dirname, '../../../.env') });

// Validate required env vars
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

if (!process.env.PAYMENT_CONFIG_ENC_KEY) {
  console.error('❌ PAYMENT_CONFIG_ENC_KEY not found in environment variables');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function updateWebhookSecret() {
  // Dynamic imports after env vars are loaded
  const { PrismaClient } = await import('@prisma/client');
  const { encryptPaymentCredentials, decryptPaymentCredentials } = await import('../src/modules/payments/v1/encryption');

  const prisma = new PrismaClient();

  try {
    console.log('🔧 Stripe Webhook Secret Update Tool\n');

    // Find test restaurant
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: 'test-restaurant' },
    });

    if (!restaurant) {
      console.error('❌ test-restaurant not found in database');
      process.exit(1);
    }

    console.log(`✅ Found restaurant: ${restaurant.name} (${restaurant.slug})`);

    // Find existing payment config
    const existingConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: {
        restaurantId: restaurant.id,
        provider: 'STRIPE',
      },
    });

    if (!existingConfig) {
      console.error('❌ No Stripe payment config found. Run setup-stripe-test.ts first.');
      process.exit(1);
    }

    console.log('✅ Found existing Stripe configuration\n');

    // Decrypt existing credentials
    const decryptedCreds = decryptPaymentCredentials(existingConfig.encryptedSecretKey);
    const credentials = JSON.parse(decryptedCreds);

    console.log('Current credentials:');
    console.log(`  Secret Key: ${credentials.secretKey.substring(0, 20)}...`);
    console.log(`  Publishable Key: ${credentials.publishableKey.substring(0, 20)}...`);
    console.log(`  Webhook Secret: ${credentials.webhookSecret || '(not set)'}\n`);

    // Ask for webhook secret
    console.log('📝 Get your webhook secret from Stripe CLI:');
    console.log('   1. Run: stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe');
    console.log('   2. Copy the webhook signing secret (starts with whsec_)\n');

    const webhookSecret = await question('Enter webhook signing secret (or press Enter to skip): ');

    if (!webhookSecret || !webhookSecret.trim()) {
      console.log('⚠️  No webhook secret provided. Skipping update.');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    if (!webhookSecret.startsWith('whsec_')) {
      console.error('❌ Invalid webhook secret format. Must start with "whsec_"');
      rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    // Update credentials with webhook secret
    const updatedCredentials = {
      ...credentials,
      webhookSecret: webhookSecret.trim(),
    };

    // Encrypt updated credentials
    const encryptedCredentials = encryptPaymentCredentials(JSON.stringify(updatedCredentials));

    // Update database
    await prisma.restaurantPaymentConfig.update({
      where: { id: existingConfig.id },
      data: {
        encryptedSecretKey: encryptedCredentials,
        webhookSecret: webhookSecret.trim(), // Also store separately for easier access
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Webhook secret updated successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your API server');
    console.log('   2. Keep Stripe CLI running with: stripe listen --forward-to http://localhost:3000/api/v1/webhooks/stripe');
    console.log('   3. Create an order and complete payment');
    console.log('   4. Watch webhook events in Stripe CLI terminal\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

updateWebhookSecret();
