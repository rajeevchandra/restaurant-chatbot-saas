import {
  IPaymentProvider,
  CheckoutSessionResult,
  WebhookVerificationResult,
  WebhookEventResult,
  RefundResult,
  CreateCheckoutSessionParams,
  WebhookRequest,
} from '../payments.types';
import { Prisma } from '@prisma/client';
import { Payment } from '@restaurant-saas/shared';

/**
 * Base abstract class for payment providers
 * Provides common utilities and enforces interface implementation
 */
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  abstract createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResult>;

  abstract verifyWebhook(req: WebhookRequest): Promise<WebhookVerificationResult>;

  abstract handleWebhookEvent(event: any): Promise<WebhookEventResult>;

  abstract refund(payment: Payment, amount?: number): Promise<RefundResult>;

  abstract testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Utility: Safely parse JSON metadata
   */
  protected parseMetadata(metadata: string | null): Record<string, any> | undefined {
    if (!metadata) return undefined;
    try {
      return JSON.parse(metadata);
    } catch {
      return undefined;
    }
  }

  /**
   * Utility: Redact sensitive info for logging
   */
  protected redactForLog(value: string, visibleChars = 4): string {
    if (!value || value.length <= visibleChars * 2) {
      return '***';
    }
    return `${value.substring(0, visibleChars)}...${value.substring(value.length - visibleChars)}`;
  }
}
