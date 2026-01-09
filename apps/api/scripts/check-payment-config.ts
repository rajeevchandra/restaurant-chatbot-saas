// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env') });

import prisma from '../src/db/prisma';

async function checkPaymentConfig() {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { slug: 'test-restaurant' }
    });

    if (!restaurant) {
      console.error('❌ Test restaurant not found');
      process.exit(1);
    }

    console.log('✅ Restaurant:', restaurant.name);
    console.log('📋 Restaurant ID:', restaurant.id);

    const configs = await prisma.restaurantPaymentConfig.findMany({
      where: { restaurantId: restaurant.id }
    });

    if (configs.length === 0) {
      console.error('❌ No payment configurations found');
      process.exit(1);
    }

    console.log(`\n✅ Found ${configs.length} payment configuration(s):\n`);
    
    configs.forEach((config, index) => {
      console.log(`Config ${index + 1}:`);
      console.log('  ID:', config.id);
      console.log('  Provider:', config.provider);
      console.log('  Active:', config.isActive);
      console.log('  Has Encrypted Key:', !!config.encryptedSecretKey);
      console.log('  Created:', config.createdAt);
      console.log('');
    });

    console.log('✅ Payment configuration is set up correctly!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentConfig();
