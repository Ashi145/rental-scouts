import { PaymentTransaction, TransactionStatus } from '../db/schema.ts';

export interface InitiatePaymentParams {
  tenantId: string;
  propertyId: string;
  landlordId: string;
  phoneNumber: string;
  paymentMethod: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'SANDBOX';
  idempotencyKey?: string;
  ipAddress?: string;
}

export interface InitiatePaymentResult {
  transaction: PaymentTransaction;
  requiresAction: boolean;
  actionType: 'USSD_PUSH' | 'REDIRECT' | 'POLL';
  instructions: string;
}

export interface VerifyPaymentResult {
  transactionId: string;
  status: TransactionStatus;
  providerTransactionId?: string;
  failureReason?: string;
  rawResponse?: unknown;
}

export interface WebhookPayload {
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
}

export interface WebhookResult {
  success: boolean;
  internalReference?: string;
  providerTransactionId?: string;
  status?: TransactionStatus;
  failureReason?: string;
  isDuplicate?: boolean;
}

export interface PaymentProvider {
  name: string;
  initiatePayment(params: {
    transaction: PaymentTransaction;
    phoneNumber: string;
    amountUGX: number;
  }): Promise<{
    providerTransactionId: string;
    instructions: string;
    status: TransactionStatus;
  }>;

  verifyPayment(providerTransactionId: string, internalReference: string): Promise<VerifyPaymentResult>;

  verifyAndParseWebhook(payload: WebhookPayload): Promise<WebhookResult>;
}
