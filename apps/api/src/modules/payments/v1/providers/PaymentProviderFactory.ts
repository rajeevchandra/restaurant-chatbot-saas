import { Prisma } from '@prisma/client';
import { PaymentProvider } from '@restaurant-saas/shared';
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
      providerType: typeof config.provider,
      restaurantId: config.restaurantId,
      hasCredentials: !!config.credentials,
    });

    // DEBUG: Log enum values
    logger.debug({
      msg: 'Comparing provider values',
      configProvider: config.provider,
      stripeEnum: PaymentProvider.STRIPE,
      squareEnum: PaymentProvider.SQUARE,
      matches: config.provider === PaymentProvider.STRIPE,
    });

    switch (config.provider) {
      case PaymentProvider.STRIPE:
        logger.debug('Factory: Creating StripeProvider');
        return new StripeProvider(config.restaurantId, config.credentials as any);

      case PaymentProvider.SQUARE:
        logger.debug('Factory: Creating SquareProvider');
        return new SquareProvider(config.restaurantId, config.credentials as any);

      default:
        logger.error({ provider: config.provider }, 'Unsupported payment provider - throwing error');
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
