import { PaymentProvider } from '@prisma/client';
import { IPaymentProvider } from '../payments.types';
import { StripeProvider } from './StripeProvider';
import { SquareProvider } from './SquareProvider';
import { DecryptedPaymentConfig } from '../payments.types';
import logger from '../../../../lib/logger';

/**
 * Factory for creating payment provider instances
 */
export class PaymentProviderFactory {
  static createProvider(config: DecryptedPaymentConfig): IPaymentProvider {
    logger.debug({
      msg: 'Creating payment provider',
      provider: config.provider,
      restaurantId: config.restaurantId,
    });

    switch (config.provider) {
      case PaymentProvider.STRIPE:
        return new StripeProvider(config.restaurantId, config.credentials as any);

      case PaymentProvider.SQUARE:
        return new SquareProvider(config.restaurantId, config.credentials as any);

      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }
  }

  /**
   * Creates a provider for testing without saving to DB
   */
  static createProviderForTesting(
    provider: PaymentProvider,
    credentials: any,
    restaurantId: string
  ): IPaymentProvider {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return new StripeProvider(restaurantId, credentials);

      case PaymentProvider.SQUARE:
        return new SquareProvider(restaurantId, credentials);

      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}
