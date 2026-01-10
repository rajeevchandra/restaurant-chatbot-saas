import prisma from '../src/db/prisma';
import { decrypt } from '../src/utils/crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function checkEncryption() {
  try {
    console.log('🔍 Checking encryption status...\n');
    
    const encKey = process.env.PAYMENT_CONFIG_ENC_KEY;
    console.log('PAYMENT_CONFIG_ENC_KEY length:', encKey?.length);
    console.log('PAYMENT_CONFIG_ENC_KEY prefix:', encKey?.substring(0, 10), '...\n');
    
    const config = await prisma.restaurantPaymentConfig.findFirst({
      where: { provider: 'STRIPE' }
    });
    
    if (!config) {
      console.log('❌ No Stripe config found');
      return;
    }
    
    console.log('Config ID:', config.id);
    console.log('Restaurant ID:', config.restaurantId);
    console.log('Encrypted secret length:', config.encryptedSecretKey?.length);
    console.log('Encrypted secret prefix:', config.encryptedSecretKey?.substring(0, 30), '...\n');
    
    // Try to decrypt
    console.log('Attempting to decrypt...');
    try {
      const decrypted = decrypt(config.encryptedSecretKey!, encKey!);
      console.log('✅ Decryption successful!');
      console.log('Decrypted key prefix:', decrypted.substring(0, 10), '...');
      console.log('Decrypted key length:', decrypted.length);
    } catch (err: any) {
      console.log('❌ Decryption failed:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEncryption();
