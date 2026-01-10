import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function checkWebhookConfig() {
  // Find test restaurant
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'test-restaurant' }
  });

  if (!restaurant) {
    console.log('Restaurant not found');
    return;
  }

  console.log('Restaurant:', restaurant.name);
  console.log('Restaurant ID:', restaurant.id);

  // Find payment config
  const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
    where: {
      restaurantId: restaurant.id,
      provider: 'STRIPE',
      isActive: true,
    },
  });

  if (!paymentConfig) {
    console.log('\n❌ No payment config found!');
    return;
  }

  console.log('\n✅ Payment config found');
  console.log('Has webhook secret:', !!paymentConfig.webhookSecret);
  console.log('Webhook secret length:', paymentConfig.webhookSecret?.length || 0);
  console.log('Webhook secret prefix:', paymentConfig.webhookSecret?.substring(0, 10) || 'N/A');
}

checkWebhookConfig()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
