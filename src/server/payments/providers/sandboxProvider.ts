import crypto from 'crypto';
import { PaymentProvider, VerifyPaymentResult, WebhookPayload, WebhookResult } from '../types.ts';
import { PaymentTransaction, TransactionStatus } from '../../db/schema.ts';

export class SandboxPaymentProvider implements PaymentProvider {
  public name = 'SANDBOX';

  async initiatePayment(params: {
    transaction: PaymentTransaction;
    phoneNumber: string;
    amountUGX: number;
  }): Promise<{
    providerTransactionId: string;
    instructions: string;
    status: TransactionStatus;
  }> {
    const providerTransactionId = `SBX-UG-${crypto.randomUUID()}`;

    return {
      providerTransactionId,
      instructions: `A USSD push notification of UGX ${params.amountUGX.toLocaleString()} has been sent to ${params.phoneNumber}. Please enter your Mobile Money PIN on your phone to complete the unlock.`,
      status: 'PROCESSING',
    };
  }

  async verifyPayment(providerTransactionId: string, internalReference: string): Promise<VerifyPaymentResult> {
    // In sandbox, treat as SUCCESS when verified, unless specifically triggered with 'FAIL' in reference
    const isFailure = internalReference.includes('FAIL');
    return {
      transactionId: internalReference,
      status: isFailure ? 'FAILED' : 'SUCCESS',
      providerTransactionId,
      failureReason: isFailure ? 'Insufficient mobile money balance' : undefined,
    };
  }

  async verifyAndParseWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const body = payload.body;
    const internalReference = (body.internalReference as string) || (body.externalId as string);
    const providerTransactionId = (body.providerTransactionId as string) || (body.financialTransactionId as string) || `SBX-WH-${Date.now()}`;
    const status = (body.status as string)?.toUpperCase() === 'FAILED' ? 'FAILED' : 'SUCCESS';

    return {
      success: true,
      internalReference,
      providerTransactionId,
      status: status as TransactionStatus,
    };
  }
}
