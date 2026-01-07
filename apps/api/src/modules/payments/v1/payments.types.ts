import { PaymentProvider, PaymentStatus, Payment } from '@prisma/client';

/**
 * Payment DTOs and Types
 */

// ========================================
// Provider Abstraction
// ========================================

export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerPaymentId: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event?: any; // Provider-specific event object
  error?: string;
}

export interface WebhookEventResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

export interface IPaymentProvider {
  /**
   * Creates a checkout session for the given order
   */
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;

  /**
   * Verifies webhook signature and parses the event
   */
  verifyWebhook(req: WebhookRequest): Promise<WebhookVerificationResult>;

  /**
   * Handles a verified webhook event and returns normalized result
   */
  handleWebhookEvent(event: any): Promise<WebhookEventResult>;

  /**
   * Initiates a refund for the given payment
   */
  refund(payment: Payment, amount?: number): Promise<RefundResult>;

  /**
   * Tests the connection with the provider
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

// ========================================
// Request Types
// ========================================

export interface CreateCheckoutSessionParams {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface WebhookRequest {
  body: any;
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer | string;
}

// ========================================
// Payment Config DTOs
// ========================================

export interface StripeCredentials {
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
}

export interface SquareCredentials {
  accessToken: string;
  locationId: string;
  webhookSecret?: string;
}

export type PaymentCredentials = StripeCredentials | SquareCredentials;

export interface UpdatePaymentConfigDTO {
  provider: PaymentProvider;
  credentials: PaymentCredentials;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentConfigDTO {
  id: string;
  provider: PaymentProvider;
  isActive: boolean;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  connectionStatus?: 'connected' | 'error' | 'not_tested';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestConnectionDTO {
  provider: PaymentProvider;
  credentials: PaymentCredentials;
}

// ========================================
// Payment DTOs
// ========================================

export interface CreatePaymentIntentDTO {
  orderId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentDTO {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Internal Types
// ========================================

export interface DecryptedPaymentConfig {
  id: string;
  restaurantId: string;
  provider: PaymentProvider;
  isActive: boolean;
  credentials: PaymentCredentials;
  webhookSecret?: string;
  metadata?: Record<string, any>;
}
