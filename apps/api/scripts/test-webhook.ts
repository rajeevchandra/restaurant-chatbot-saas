import prisma from '../src/db/prisma';

async function testWebhook() {
  try {
    console.log('=== Testing Webhook Flow ===\n');
    
    // Get the most recent payment
    const payment = await prisma.payment.findFirst({
      where: {
        provider: 'STRIPE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      console.log('❌ No payment found');
      return;
    }

    console.log('Found payment:');
    console.log('  Payment ID:', payment.id);
    console.log('  Order ID:', payment.orderId);
    console.log('  Provider Payment ID:', payment.providerPaymentId);
    console.log('  Provider Session ID:', payment.providerSessionId);
    console.log('  Payment Status:', payment.status);
    console.log('  Order Status:', payment.order.status);
    console.log('');

    // Check webhook events
    const webhookEvents = await prisma.webhookEvent.findMany({
      where: {
        provider: 'STRIPE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log('Recent webhook events:', webhookEvents.length);
    webhookEvents.forEach((event, i) => {
      console.log(`  ${i + 1}. Event: ${event.eventType}, Status: ${event.status}, ID: ${event.providerEventId}`);
    });
    console.log('');

    // Check if order is stuck
    if (payment.order.status === 'PAYMENT_PENDING' && payment.status === 'PENDING') {
      console.log('⚠️  Order is stuck at PAYMENT_PENDING');
      console.log('   Payment record exists but webhooks may not be processing');
    } else if (payment.order.status === 'PAID') {
      console.log('✅ Order is already PAID');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhook();
