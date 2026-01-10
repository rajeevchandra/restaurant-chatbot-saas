import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function checkOrderStatus() {
  const orderIdPrefix = process.argv[2];
  
  if (!orderIdPrefix) {
    console.log('Usage: npx tsx scripts/check-order-status.ts <order-id-prefix>');
    console.log('Example: npx tsx scripts/check-order-status.ts 883dd66b');
    process.exit(1);
  }

  const orders = await prisma.order.findMany({
    where: {
      id: {
        contains: orderIdPrefix
      }
    },
    include: {
      items: true,
      payments: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  if (orders.length === 0) {
    console.log(`No orders found matching: ${orderIdPrefix}`);
    process.exit(0);
  }

  console.log(`\nFound ${orders.length} order(s):\n`);

  orders.forEach(order => {
    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Total: $${order.total}`);
    console.log(`Created: ${order.createdAt}`);
    console.log(`Customer: ${order.customerName || 'N/A'}`);
    console.log(`Phone: ${order.customerPhone || 'N/A'}`);
    console.log(`Email: ${order.customerEmail || 'N/A'}`);
    console.log(`Items: ${order.items.length}`);
    console.log(`Payments: ${order.payments.length}`);
    
    if (order.payments.length > 0) {
      order.payments.forEach(payment => {
        console.log(`  - Payment Status: ${payment.status}`);
        console.log(`    Amount: $${payment.amount}`);
        console.log(`    Provider: ${payment.provider}`);
      });
    }
    console.log('---\n');
  });
}

checkOrderStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
