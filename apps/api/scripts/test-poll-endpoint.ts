import 'dotenv/config';

/**
 * Test the payment polling endpoint
 * This simulates what the widget does when user clicks the payment link
 */
async function testPollingEndpoint() {
  const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
  
  // Get the most recent pending payment order
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Finding most recent pending payment...\n');
    
    const payment = await prisma.payment.findFirst({
      where: {
        status: 'PENDING',
        provider: 'STRIPE',
      },
      include: {
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!payment || !payment.order) {
      console.log('❌ No pending payment found to test');
      return;
    }

    console.log('Found payment:');
    console.log(`  Order ID: ${payment.order.id}`);
    console.log(`  Payment ID: ${payment.id}`);
    console.log(`  Session ID: ${payment.providerPaymentId}`);
    console.log(`  Order Status: ${payment.order.status}`);
    console.log(`  Payment Status: ${payment.status}`);
    console.log('');

    console.log(`🔄 Calling polling endpoint: POST ${API_URL}/api/v1/payments/poll/${payment.order.id}\n`);

    // Call the polling endpoint
    const response = await fetch(`${API_URL}/api/v1/payments/poll/${payment.order.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    console.log('\nResponse body:');
    console.log(JSON.stringify(result, null, 2));

    // Check the order status again
    console.log('\n📊 Checking order status after poll...\n');
    
    const updatedOrder = await prisma.order.findUnique({
      where: { id: payment.order.id },
      include: { payments: true },
    });

    if (updatedOrder) {
      console.log(`Order Status: ${updatedOrder.status}`);
      console.log(`Payment Status: ${updatedOrder.payments?.[0]?.status}`);
      
      if (updatedOrder.status === 'PAID') {
        console.log('\n✅ SUCCESS! Order was updated to PAID');
      } else if (result.status === 'PENDING') {
        console.log('\n⏳ Payment still pending (user hasn\'t paid yet)');
      } else if (result.status === 'FAILED') {
        console.log('\n❌ Payment session expired or failed');
      }
    }

  } catch (error: any) {
    console.error('❌ Error testing polling endpoint:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  } finally {
    await prisma.$disconnect();
  }
}

console.log('=== Testing Payment Polling Endpoint ===\n');
testPollingEndpoint();
