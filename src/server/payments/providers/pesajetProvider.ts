import { PesaJet, type Transaction as PesaJetTransaction } from '@pesajet/sdk';
import { db } from '../../db/database.ts';
import { PaymentTransaction, TransactionStatus } from '../../db/schema.ts';
import { normalizeUgandanPhone } from '../../auth/authService.ts';
import { PaymentProvider, VerifyPaymentResult, WebhookPayload, WebhookResult } from '../types.ts';

function toLocalStatus(status: PesaJetTransaction['status']): TransactionStatus {
  if (status === 'COMPLETED') return 'SUCCESS';
  if (status === 'FAILED') return 'FAILED';
  if (status === 'EXPIRED') return 'EXPIRED';
  return status;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export class PesaJetPaymentProvider implements PaymentProvider {
  public readonly name = 'PESAJET';

  private getClient(): PesaJet {
    const apiKey = process.env.PESAJET_API_KEY;
    if (!apiKey) throw new Error('PesaJet is not configured. Set PESAJET_API_KEY on the server.');
    return new PesaJet({
      apiKey,
      webhookSecret: process.env.PESAJET_WEBHOOK_SECRET,
      baseUrl: process.env.PESAJET_BASE_URL || undefined,
    });
  }

  async initiatePayment(params: {
    transaction: PaymentTransaction;
    phoneNumber: string;
    amountUGX: number;
  }): Promise<{ providerTransactionId: string; instructions: string; status: TransactionStatus }> {
    const client = this.getClient();
    const phone = normalizeUgandanPhone(params.phoneNumber);
    const payment = await client.payments.create({
      type: 'COLLECTION',
      amount: params.amountUGX,
      currency: 'UGX',
      phoneNumber: phone,
      provider: params.transaction.paymentMethod === 'MTN_MOMO' ? 'mtn' : 'airtel',
      reference: params.transaction.internalReference,
      description: `Rental Scout property contact unlock`,
      metadata: {
        rentalScoutTransactionId: params.transaction.id,
        propertyId: params.transaction.propertyId,
      },
      idempotencyKey: params.transaction.idempotencyKey,
    });

    const expectedProvider = params.transaction.paymentMethod === 'MTN_MOMO' ? 'mtn' : 'airtel';
    if (payment.amount !== params.amountUGX || payment.currency !== 'UGX'
      || payment.reference !== params.transaction.internalReference || payment.provider !== expectedProvider) {
      throw new Error('PesaJet returned transaction details that do not match this payment.');
    }

    return {
      providerTransactionId: payment.transactionId,
      status: toLocalStatus(payment.status),
      instructions: payment.status === 'COMPLETED'
        ? 'Payment received. Your landlord contact is being unlocked.'
        : 'A mobile money prompt has been sent to your phone. Approve it with your PIN to continue.',
    };
  }

  async verifyPayment(providerTransactionId: string, internalReference: string): Promise<VerifyPaymentResult> {
    if (!providerTransactionId) {
      return { transactionId: internalReference, status: 'FAILED', failureReason: 'Missing PesaJet transaction ID.' };
    }

    const localTransaction = db.getTransactionById(internalReference);
    if (!localTransaction || localTransaction.provider !== this.name
      || (localTransaction.providerTransactionId && localTransaction.providerTransactionId !== providerTransactionId)) {
      return { transactionId: internalReference, providerTransactionId, status: 'FAILED', failureReason: 'PesaJet transaction does not match the local payment.' };
    }

    const payment = await this.getClient().payments.get(providerTransactionId);
    const expectedProvider = localTransaction.paymentMethod === 'MTN_MOMO' ? 'mtn' : 'airtel';
    const detailsMatch = payment.transactionId === providerTransactionId
      && payment.reference === localTransaction.internalReference
      && payment.amount === localTransaction.amountUGX
      && payment.currency === localTransaction.currency
      && payment.provider === expectedProvider;

    if (!detailsMatch) {
      return { transactionId: internalReference, status: 'FAILED', failureReason: 'PesaJet transaction details failed verification.', rawResponse: payment };
    }

    return {
      transactionId: internalReference,
      providerTransactionId,
      status: toLocalStatus(payment.status),
      failureReason: payment.failureReason,
      rawResponse: payment,
    };
  }

  async verifyAndParseWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const signatureHeader = payload.headers['x-webhook-signature'] ?? payload.headers['X-Webhook-Signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const body = payload.body;

    let isValid = false;
    try {
      isValid = this.getClient().webhooks.verify(body, signature);
    } catch {
      return { success: false, failureReason: 'PesaJet webhook verification is not configured.' };
    }
    if (!isValid) return { success: false, failureReason: 'Invalid PesaJet webhook signature.' };

    const event = getString(body.event);
    if (event === 'ping') return { success: true };
    const suppliedStatus = getString(body.status);
    const status = event === 'payment.completed' ? 'SUCCESS'
      : event === 'payment.failed' ? 'FAILED'
      : event === 'payment.expired' ? 'EXPIRED'
      : undefined;
    const internalReference = getString(body.reference);
    const providerTransactionId = getString(body.transactionId);
    const amount = typeof body.amount === 'number' ? body.amount : undefined;
    const currency = getString(body.currency);

    const expectedStatus = status === 'SUCCESS' ? 'COMPLETED' : status;
    if (!status || suppliedStatus !== expectedStatus || !internalReference || !providerTransactionId || amount === undefined || !currency) {
      return { success: false, failureReason: 'PesaJet webhook is missing required payment details.' };
    }

    return {
      success: true,
      internalReference,
      providerTransactionId,
      status,
      amount,
      currency,
      failureReason: getString(body.failureReason),
    };
  }
}
