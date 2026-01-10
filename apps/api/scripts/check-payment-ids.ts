import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function checkPayment() {
  const orderIdPrefix = process.argv[2] || '883dd66b';

  const order = await prisma.order.findFirst({
    where: {
      id: {
        contains: orderIdPrefix
      }
    },
    include: {
      payments: true
    }
  });

  if (!order) {
    console.log('Order not found');
    return;
  }

  console.log('\nOrder:', order.id);
  console.log('Status:', order.status);
  console.log('\nPayments:');
  
  order.payments.forEach(payment => {
    console.log('\nPayment ID:', payment.id);
    console.log('Provider Payment ID:', payment.providerPaymentId || 'NULL');
    console.log('Provider Session ID:', payment.providerSessionId || 'NULL');
    console.log('Status:', payment.status);
    console.log('Amount:', payment.amount);
  });
}

checkPayment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
