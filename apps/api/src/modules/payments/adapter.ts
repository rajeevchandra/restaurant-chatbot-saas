import { PaymentProvider } from '@prisma/client';
import Stripe from 'stripe';
import { Client as SquareClient, Environment } from 'square';
import crypto from 'crypto';

export interface PaymentAdapter {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any>,
    returnUrl?: string
  ): Promise<{ paymentIntentId: string; clientSecret?: string; checkoutUrl?: string }>;
  
  verifyWebhook(payload: string | Buffer, signature: string): any;
  
  processWebhook(event: any): Promise<{
    type: string;
    paymentId: string;
    status: 'succeeded' | 'failed' | 'refunded' | 'pending';
    metadata?: Record<string, any>;
  }>;
}

export class StripeProvider implements PaymentAdapter {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(secretKey: string, webhookSecret?: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    this.webhookSecret = webhookSecret;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any>,
    returnUrl?: string
  ): Promise<{ paymentIntentId: string; clientSecret?: string; checkoutUrl?: string }> {
    // Create Checkout Session for better UX
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: 'Order Payment',
              description: `Order #${metadata.orderId}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: returnUrl ? `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}` : undefined,
      cancel_url: returnUrl ? `${returnUrl}?cancelled=true` : undefined,
      metadata,
    });

    return {
      paymentIntentId: session.id,
      checkoutUrl: session.url || undefined,
    };
  }

  verifyWebhook(payload: string | Buffer, signature: string): any {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }
    
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }
  }

  async processWebhook(event: Stripe.Event): Promise<any> {
    const session = event.data.object as Stripe.Checkout.Session;
    
    let status: 'succeeded' | 'failed' | 'refunded' | 'pending' = 'pending';
    
    switch (event.type) {
      case 'checkout.session.completed':
        status = session.payment_status === 'paid' ? 'succeeded' : 'pending';
        break;
      case 'checkout.session.async_payment_succeeded':
        status = 'succeeded';
        break;
      case 'checkout.session.async_payment_failed':
        status = 'failed';
        break;
      case 'charge.refunded':
        status = 'refunded';
        break;
    }

    return {
      type: event.type,
      paymentId: session.id,
      status,
      metadata: session.metadata || {},
    };
  }
}

export class SquareProvider implements PaymentAdapter {
  private client: SquareClient;
  private webhookSecret?: string;

  constructor(accessToken: string, webhookSecret?: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.client = new SquareClient({
      accessToken,
      environment: environment === 'production' ? Environment.Production : Environment.Sandbox,
    });
    this.webhookSecret = webhookSecret;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any>,
    returnUrl?: string
  ): Promise<{ paymentIntentId: string; checkoutUrl?: string }> {
    const { result } = await this.client.checkoutApi.createPaymentLink({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: metadata.locationId || process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: 'Order Payment',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(amount),
              currency: currency.toUpperCase(),
            },
          },
        ],
        metadata: Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>),
      },
      checkoutOptions: {
        redirectUrl: returnUrl,
        allowTipping: false,
      },
    });

    return {
      paymentIntentId: result.paymentLink?.id || '',
      checkoutUrl: result.paymentLink?.url || undefined,
    };
  }

  verifyWebhook(payload: string | Buffer, signature: string): any {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Square webhook verification
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const hash = hmac.update(payload).digest('base64');

    if (hash !== signature) {
      throw new Error('Webhook signature verification failed');
    }

    return JSON.parse(payload.toString());
  }

  async processWebhook(event: any): Promise<any> {
    let status: 'succeeded' | 'failed' | 'refunded' | 'pending' = 'pending';
    
    switch (event.type) {
      case 'payment.created':
      case 'payment.updated':
        const paymentStatus = event.data?.object?.payment?.status;
        if (paymentStatus === 'COMPLETED') {
          status = 'succeeded';
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
          status = 'failed';
        }
        break;
      case 'refund.created':
      case 'refund.updated':
        if (event.data?.object?.refund?.status === 'COMPLETED') {
          status = 'refunded';
        }
        break;
    }

    return {
      type: event.type,
      paymentId: event.data?.object?.payment?.id || event.data?.object?.payment_link?.id || '',
      status,
      metadata: event.data?.object?.payment?.order_id ? { orderId: event.data.object.payment.order_id } : {},
    };
  }
}

export function createPaymentAdapter(
  provider: PaymentProvider,
  config: { secretKey: string; webhookSecret?: string }
): PaymentAdapter {
  switch (provider) {
    case 'STRIPE':
      return new StripeProvider(config.secretKey, config.webhookSecret);
    case 'SQUARE':
      return new SquareProvider(config.secretKey, config.webhookSecret);
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}
