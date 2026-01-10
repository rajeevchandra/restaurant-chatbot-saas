import prisma from '../src/db/prisma';
import { decryptSecret } from '../src/utils/crypto';

async function checkWebhookSecret() {
  try {
    console.log('=== Checking Webhook Secret ===\n');
    
    const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log('ENV file secret:', envSecret?.substring(0, 20) + '...');
    console.log('ENV secret length:', envSecret?.length);
    console.log('');

    const config = await prisma.restaurantPaymentConfig.findFirst({
      where: {
        provider: 'STRIPE',
        isActive: true,
      },
      include: {
        restaurant: true,
      },
    });

    if (!config) {
      console.log('❌ No active Stripe config found in database');
      return;
    }

    console.log('Restaurant:', config.restaurant.name);
    console.log('DB webhook secret:', config.webhookSecret?.substring(0, 20) + '...');
    console.log('DB secret length:', config.webhookSecret?.length);
    console.log('');

    if (envSecret === config.webhookSecret) {
      console.log('✅ Secrets MATCH!');
    } else {
      console.log('❌ Secrets DO NOT MATCH!');
      console.log('');
      console.log('The database has a different webhook secret than your .env file.');
      console.log('Run: npx tsx scripts/setup-stripe-test.ts to sync them');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhookSecret();
