// Load environment variables FIRST before any imports
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPath = resolve(__dirname, '../../../.env');
console.log('📁 Loading .env from:', envPath);
console.log('📁 File exists:', existsSync(envPath));

const result = config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully');
  console.log('🔑 PAYMENT_CONFIG_ENC_KEY present:', !!process.env.PAYMENT_CONFIG_ENC_KEY);
}

// Now import modules that depend on environment variables
import crypto from 'crypto';
import prisma from '../src/db/prisma';

/**
 * Setup test Stripe configuration for test-restaurant
 * 
 * Usage:
 * 1. Ensure PAYMENT_CONFIG_ENC_KEY is set in .env file
 * 2. Replace STRIPE_SECRET_KEY with your test secret key (sk_test_...)
 * 3. Run: npx tsx scripts/setup-stripe-test.ts
 */

async function setupStripeTest() {
  // Dynamically import encryption module after env is loaded
  const { encryptPaymentCredentials } = await import('../src/modules/payments/v1/encryption');
  // Check for encryption key
  if (!process.env.PAYMENT_CONFIG_ENC_KEY) {
    console.error('❌ PAYMENT_CONFIG_ENC_KEY is not set in your .env file!');
    console.log('\n📝 To fix this, add the following to your .env file:');
    console.log('\nPAYMENT_CONFIG_ENC_KEY=' + crypto.randomBytes(32).toString('hex'));
    console.log('\nOr run this command:');
    console.log('node -e "console.log(\'PAYMENT_CONFIG_ENC_KEY=\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  const STRIPE_SECRET_KEY: string = 'sk_test_51SngZC8wkw28P0787UeN3sSnARND1yX3j7ojgE4nH7uBPwWwmcjmHUVUBTloeeEtK8zP17lAnK7qa0FBYZFt1R2M00ynYw7vdD'; // Replace with your actual test key
  const STRIPE_PUBLISHABLE_KEY: string = 'pk_test_51SngZC8wkw28P078K9F6uzkiF9SmqXqgqlxGDYMFygTU2W8OaNsEJKF1kWZHiqlozcMhkBK7mDlFso5ubeAo2a2900lph3ozw0'; // Replace with your actual publishable key
  
  if (STRIPE_SECRET_KEY === 'sk_test_YOUR_KEY_HERE') {
    console.error('❌ Please edit this script and add your Stripe test keys first!');
    console.log('\n📝 Get your keys from: https://dashboard.stripe.com/test/apikeys');
    process.exit(1);
  }

  try {
    // Find test restaurant
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: 'test-restaurant' }
    });

    if (!restaurant) {
      console.error('❌ Test restaurant not found. Run seed script first.');
      process.exit(1);
    }

    console.log('✅ Found restaurant:', restaurant.name);

    // Check if payment config already exists
    const existing = await prisma.restaurantPaymentConfig.findFirst({
      where: { restaurantId: restaurant.id }
    });

    if (existing) {
      console.log('⚠️  Payment config already exists. Updating...');
    }

    // Encrypt credentials
    const credentials = {
      secretKey: STRIPE_SECRET_KEY,
      publishableKey: STRIPE_PUBLISHABLE_KEY,
    };

    const encryptedCredentials = encryptPaymentCredentials(JSON.stringify(credentials));

    // Create or update payment config
    const config = await prisma.restaurantPaymentConfig.upsert({
      where: { 
        id: existing?.id || 'new-config-id' 
      },
      create: {
        restaurantId: restaurant.id,
        provider: 'STRIPE',
        encryptedSecretKey: encryptedCredentials,
        isActive: true,
        metadata: JSON.stringify({
          mode: 'test',
          setupAt: new Date().toISOString(),
        }),
      },
      update: {
        encryptedSecretKey: encryptedCredentials,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Stripe test configuration saved!');
    console.log('📋 Config ID:', config.id);
    console.log('🔑 Provider:', config.provider);
    console.log('✓ Status: Active');
    console.log('\n🎉 You can now test payments in the widget!');
    console.log('💳 Use test card: 4242 4242 4242 4242');
    console.log('📅 Expiry: Any future date');
    console.log('🔐 CVC: Any 3 digits');

  } catch (error) {
    console.error('❌ Failed to setup Stripe:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupStripeTest();
