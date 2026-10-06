import { PaymentProvider, VerifyPaymentResult, WebhookPayload, WebhookResult } from '../types.ts';
import { PaymentTransaction } from '../../db/schema.ts';

/** Disabled until the current MTN Collections documentation and credentials are verified. */
export class MtnMomoPaymentProvider implements PaymentProvider {
  public readonly name = 'MTN_MOMO';

  async initiatePayment(_params: {
    transaction: PaymentTransaction;
    phoneNumber: string;
    amountUGX: number;
  }): Promise<{ providerTransactionId: string; instructions: string; status: 'PENDING' | 'PROCESSING' }> {
    throw new Error('MTN MoMo collections are not configured.');
  }

  async verifyPayment(providerTransactionId: string, internalReference: string): Promise<VerifyPaymentResult> {
    return { transactionId: internalReference, providerTransactionId, status: 'PROCESSING' };
  }

  async verifyAndParseWebhook(_payload: WebhookPayload): Promise<WebhookResult> {
    return { success: false, failureReason: 'MTN webhook verification is not configured.' };
  }
}
