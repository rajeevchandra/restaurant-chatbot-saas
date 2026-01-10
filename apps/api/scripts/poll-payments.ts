import prisma from '../src/db/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

async function pollPaymentStatus() {
  try {
    console.log('🔍 Checking pending payments...\n');

    // Find all pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        provider: 'STRIPE',
        providerPaymentId: {
          not: null,
        },
      },
      include: {
        order: true,
      },
      take: 10,
    });

    console.log(`Found ${pendingPayments.length} pending payment(s)\n`);

    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) continue;

      console.log(`Checking payment ${payment.id}`);
      console.log(`  Session ID: ${payment.providerPaymentId}`);

      try {
        // Retrieve checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(
          payment.providerPaymentId
        );

        console.log(`  Stripe status: ${session.payment_status}`);
        console.log(`  Session status: ${session.status}`);

        // Update if payment is complete
        if (session.payment_status === 'paid' && session.status === 'complete') {
          console.log('  ✅ Payment completed! Updating order...');

          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'COMPLETED' },
            });

            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PAID' },
            });
          });

          console.log('  ✅ Order updated to PAID\n');
        } else if (session.payment_status === 'unpaid') {
          console.log('  ⏳ Still unpaid\n');
        } else {
          console.log(`  ⚠️  Unknown status: ${session.payment_status}\n`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking session:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('✅ Poll complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

pollPaymentStatus();
