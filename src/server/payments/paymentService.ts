import crypto from 'crypto';
import { db } from '../db/database.ts';
import { ContactUnlock, PaymentTransaction, TransactionStatus } from '../db/schema.ts';
import { InitiatePaymentParams, InitiatePaymentResult, PaymentProvider, WebhookPayload, WebhookResult } from './types.ts';
import { SandboxPaymentProvider } from './providers/sandboxProvider.ts';
import { MtnMomoPaymentProvider } from './providers/mtnProvider.ts';
import { AirtelMoneyPaymentProvider } from './providers/airtelProvider.ts';
import { PesaJetPaymentProvider } from './providers/pesajetProvider.ts';
import { PesaJetError } from '@pesajet/sdk';
import { isValidUgandanPhone, normalizeUgandanPhone } from '../auth/authService.ts';

export const UNLOCK_FEE_UGX = Number(process.env.UNLOCK_FEE_UGX || 5000);

export class PaymentUnavailableError extends Error {
  constructor() {
    super('Payments are temporarily unavailable.');
    this.name = 'PaymentUnavailableError';
  }
}

class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private sandboxEnabled: boolean;
  private pesajetEnabled: boolean;

  constructor() {
    this.sandboxEnabled = process.env.NODE_ENV !== 'production' && process.env.PAYMENT_PROVIDER?.toLowerCase() === 'sandbox';
    this.pesajetEnabled = process.env.PAYMENT_PROVIDER?.toLowerCase() === 'pesajet';
    if (this.sandboxEnabled) this.providers.set('SANDBOX', new SandboxPaymentProvider());
    this.providers.set('MTN_MOMO', new MtnMomoPaymentProvider());
    this.providers.set('AIRTEL_MONEY', new AirtelMoneyPaymentProvider());
    this.providers.set('PESAJET', new PesaJetPaymentProvider());
  }

  private getProvider(method?: string): PaymentProvider {
    if (method !== 'MTN_MOMO' && method !== 'AIRTEL_MONEY') {
      throw new Error('Unsupported payment provider.');
    }
    if (this.sandboxEnabled) return this.providers.get('SANDBOX')!;
    if (this.pesajetEnabled) {
      if (!process.env.PESAJET_API_KEY || !process.env.PESAJET_WEBHOOK_SECRET) throw new PaymentUnavailableError();
      return this.providers.get('PESAJET')!;
    }

    // Provider adapters are intentionally unavailable until their API integrations
    // are verified and credentials are configured; never return a simulated success.
    throw new PaymentUnavailableError();
  }

  public async initiateContactUnlockPayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const { tenantId, propertyId, landlordId, phoneNumber, paymentMethod, idempotencyKey } = params;

    // 1. Verify property exists and is valid
    const property = db.getPropertyById(propertyId);
    if (!property) {
      throw new Error('Property not found');
    }
    if (property.status !== 'APPROVED' || !property.isAvailable) {
      throw new Error('This property is not available for contact unlock.');
    }
    if (!isValidUgandanPhone(phoneNumber)) {
      throw new Error('Enter a valid Ugandan mobile money phone number.');
    }
    const provider = this.getProvider(paymentMethod);

    // 2. Check if already unlocked (duplicate payment prevention)
    const existingUnlock = db.getContactUnlock(tenantId, propertyId);
    if (existingUnlock) {
      const existingTx = db.getTransactionById(existingUnlock.transactionId) || {
        id: `tx_prev_${existingUnlock.id}`,
        tenantId,
        propertyId,
        landlordId,
        amountUGX: UNLOCK_FEE_UGX,
        currency: 'UGX',
        provider: 'SANDBOX',
        internalReference: `RS-PREV-${existingUnlock.id}`,
        status: 'SUCCESS' as TransactionStatus,
        paymentMethod: 'SANDBOX',
        payerPhoneMasked: '256***',
        idempotencyKey: 'prev',
        createdAt: existingUnlock.createdAt,
        updatedAt: existingUnlock.createdAt,
      };

      return {
        transaction: existingTx,
        requiresAction: false,
        actionType: 'POLL',
        instructions: 'Contact is already unlocked for this property.',
      };
    }

    // 3. Check idempotency key if provided
    if (idempotencyKey) {
      const existingTx = db.getTransactionsByTenant(tenantId).find(tx => tx.idempotencyKey === idempotencyKey);
      if (existingTx && (existingTx.status === 'PENDING' || existingTx.status === 'PROCESSING')) {
        return {
          transaction: existingTx,
          requiresAction: true,
          actionType: 'USSD_PUSH',
          instructions: 'Payment already initiated. Please check your phone for the PIN prompt.',
        };
      }
    }

    // 4. Generate internal transaction reference
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const internalReference = `RS-TX-${dateStr}-${crypto.randomUUID()}`;

    // 5. Mask phone number for storage
    const maskedPhone = phoneNumber.length >= 7
      ? phoneNumber.slice(0, 5) + '***' + phoneNumber.slice(-3)
      : '***';

    // 6. Create initial pending transaction in database (Strictly 5,000 UGX from backend)
    const providerNameEnum = provider.name as 'MTN_MOMO' | 'AIRTEL_MONEY' | 'PESAJET' | 'SANDBOX';

    const transaction = db.createTransaction({
      tenantId,
      propertyId,
      landlordId,
      amountUGX: UNLOCK_FEE_UGX,
      currency: 'UGX',
      provider: providerNameEnum,
      internalReference,
      status: 'PENDING',
      paymentMethod,
      payerPhoneMasked: maskedPhone,
      idempotencyKey: idempotencyKey || internalReference,
      metadata: {
        propertyTitle: property.title,
        initiatorIp: params.ipAddress,
      },
    });

    // 7. Request payment from provider
    try {
      const providerRes = await provider.initiatePayment({
        transaction,
        phoneNumber,
        amountUGX: UNLOCK_FEE_UGX,
      });

      // Update transaction with provider ID and processing status
      const statusBeforeUnlock = providerRes.status === 'SUCCESS' ? 'PROCESSING' : providerRes.status;
      db.updateTransaction(transaction.id, {
        providerTransactionId: providerRes.providerTransactionId,
        status: statusBeforeUnlock,
      });

      const completed = providerRes.status === 'SUCCESS'
        ? db.completeSuccessfulUnlock(transaction.id, db.resolvePropertyContact(transaction.propertyId))
        : undefined;

      return {
        transaction: {
          ...transaction,
          providerTransactionId: providerRes.providerTransactionId,
          status: completed?.transaction.status || statusBeforeUnlock,
        },
        requiresAction: true,
        actionType: 'USSD_PUSH',
        instructions: providerRes.instructions,
      };
    } catch (err: unknown) {
      if (provider.name === 'PESAJET' && err instanceof PesaJetError
        && (err.statusCode === 408 || err.statusCode === 500 || err.errorCode === 'NETWORK_ERROR')) {
        const pendingTransaction = db.updateTransaction(transaction.id, {
          status: 'PROCESSING',
          failureReason: 'PesaJet did not return a response; waiting for provider confirmation.',
        })!;
        return {
          transaction: pendingTransaction,
          requiresAction: true,
          actionType: 'POLL',
          instructions: 'We are waiting to confirm whether the mobile money prompt was sent. Please wait for an update and do not retry yet.',
        };
      }
      db.updateTransaction(transaction.id, {
        status: 'FAILED',
        failureReason: err instanceof Error ? err.message : 'Provider initiation failed',
      });
      throw err;
    }
  }

  public async completeAndVerifyTransaction(transactionId: string, providerTransactionIdOverride?: string): Promise<{
    transaction: PaymentTransaction;
    contactUnlock?: ContactUnlock;
  }> {
    const transaction = db.getTransactionById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // If already successful, return existing unlock
    if (transaction.status === 'SUCCESS') {
      const unlock = db.getContactUnlock(transaction.tenantId, transaction.propertyId);
      return { transaction, contactUnlock: unlock };
    }

    const provider = this.getProvider(transaction.paymentMethod);
    const verification = await provider.verifyPayment(
      providerTransactionIdOverride || transaction.providerTransactionId || '',
      transaction.internalReference
    );

    if (transaction.provider === 'PESAJET' && !verification.providerTransactionId) {
      throw new Error(verification.failureReason || 'PesaJet transaction could not be verified.');
    }
    if (verification.providerTransactionId) {
      db.updateTransaction(transaction.id, { providerTransactionId: verification.providerTransactionId, status: 'PROCESSING' });
    }

    if (verification.status === 'SUCCESS') {
      const contactInfo = db.resolvePropertyContact(transaction.propertyId);
      const completion = db.completeSuccessfulUnlock(transaction.id, contactInfo);
      if (!completion) throw new Error('Could not atomically record the confirmed payment unlock.');
      return completion;
    } else {
      const failedTx = db.updateTransaction(transaction.id, {
        status: verification.status,
        failureReason: verification.failureReason || 'Payment authorization failed',
      })!;
      return { transaction: failedTx };
    }
  }

  public async verifyWebhook(payload: WebhookPayload, providerName?: string): Promise<WebhookResult> {
    if (providerName?.toLowerCase() !== 'pesajet') {
      return { success: false, failureReason: 'Unsupported payment webhook provider.' };
    }
    return this.providers.get('PESAJET')!.verifyAndParseWebhook(payload);
  }

  public async processVerifiedWebhook(result: WebhookResult): Promise<void> {
    if (!result.success || !result.internalReference || !result.providerTransactionId) return;
    const transaction = db.getTransactionById(result.internalReference);
    if (!transaction || transaction.provider !== 'PESAJET'
      || (transaction.providerTransactionId && transaction.providerTransactionId !== result.providerTransactionId)
      || transaction.amountUGX !== result.amount || transaction.currency !== result.currency) {
      throw new Error('PesaJet webhook does not match a local transaction.');
    }

    // The signed webhook is a prompt to check; the authenticated PesaJet API result
    // remains authoritative before any contact details are unlocked.
    await this.completeAndVerifyTransaction(transaction.id, result.providerTransactionId);
  }
}

export const paymentService = new PaymentService();
