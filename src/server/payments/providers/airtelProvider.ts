import { PaymentProvider, VerifyPaymentResult, WebhookPayload, WebhookResult } from '../types.ts';
import { PaymentTransaction } from '../../db/schema.ts';

/** Disabled until the current Airtel Money Collections documentation and credentials are verified. */
export class AirtelMoneyPaymentProvider implements PaymentProvider {
  public readonly name = 'AIRTEL_MONEY';

  async initiatePayment(_params: {
    transaction: PaymentTransaction;
    phoneNumber: string;
    amountUGX: number;
  }): Promise<{ providerTransactionId: string; instructions: string; status: 'PENDING' | 'PROCESSING' }> {
    throw new Error('Airtel Money collections are not configured.');
  }

  async verifyPayment(providerTransactionId: string, internalReference: string): Promise<VerifyPaymentResult> {
    return { transactionId: internalReference, providerTransactionId, status: 'PROCESSING' };
  }

  async verifyAndParseWebhook(_payload: WebhookPayload): Promise<WebhookResult> {
    return { success: false, failureReason: 'Airtel webhook verification is not configured.' };
  }
}
