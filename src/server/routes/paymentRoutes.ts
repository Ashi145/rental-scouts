import { Router, Response } from 'express';
import { paymentService, PaymentUnavailableError, UNLOCK_FEE_UGX } from '../payments/paymentService.ts';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.post('/initiate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { propertyId, phoneNumber, paymentMethod, idempotencyKey } = req.body ?? {};
    if (paymentMethod !== 'MTN_MOMO' && paymentMethod !== 'AIRTEL_MONEY') {
      return res.status(400).json({ error: 'Unsupported payment method.' });
    }
    if (typeof propertyId !== 'string' || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return res.status(400).json({ error: 'Property ID and mobile money phone number are required.' });
    }

    const tenant = req.user!;
    const property = db.getPropertyById(propertyId);
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    if (property.landlordId === tenant.id) return res.status(400).json({ error: 'You are the landlord of this property.' });

    const result = await paymentService.initiateContactUnlockPayment({
      tenantId: tenant.id,
      propertyId: property.id,
      landlordId: property.landlordId,
      phoneNumber: phoneNumber.trim(),
      paymentMethod,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      amountUGX: UNLOCK_FEE_UGX,
      currency: process.env.PAYMENT_CURRENCY || 'UGX',
      transaction: {
        id: result.transaction.id,
        internalReference: result.transaction.internalReference,
        status: result.transaction.status,
        provider: result.transaction.provider,
        payerPhoneMasked: result.transaction.payerPhoneMasked,
      },
      requiresAction: result.requiresAction,
      actionType: result.actionType,
      instructions: result.instructions,
    });
  } catch (error: unknown) {
    console.error('Payment initiation failed:', error);
    if (error instanceof PaymentUnavailableError) {
      return res.status(503).json({ error: 'Payments are temporarily unavailable.' });
    }
    if (error instanceof Error && /not found|not available|valid Ugandan|Unsupported/.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to initiate payment.' });
  }
});

router.get('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  let transaction = db.getTransactionById(req.params.id);
  if (!transaction || (transaction.tenantId !== req.user!.id && req.user!.role !== 'ADMIN')) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  // Recover from delayed/missed webhooks by asking PesaJet for the authoritative
  // transaction status when the tenant checks their pending payment.
  if (transaction.provider === 'PESAJET' && transaction.providerTransactionId
    && ['PENDING', 'PROCESSING'].includes(transaction.status)) {
    try {
      await paymentService.completeAndVerifyTransaction(transaction.id);
      transaction = db.getTransactionById(transaction.id)!;
    } catch (error) {
      console.error('PesaJet payment status check failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  const unlock = transaction.status === 'SUCCESS'
    ? db.getContactUnlock(transaction.tenantId, transaction.propertyId)
    : undefined;
  let contactUnlock;
  if (unlock) {
    try {
      const contact = db.resolvePropertyContact(transaction.propertyId);
      contactUnlock = {
        revealedPhone: contact.phone,
        revealedLandlordName: contact.name,
        whatsappEnabled: contact.whatsappEnabled,
        unlockedAt: unlock.createdAt,
      };
    } catch {
      // A successful historic payment does not bypass current phone verification.
    }
  }

  return res.json({
    transaction: {
      id: transaction.id,
      internalReference: transaction.internalReference,
      status: transaction.status,
      amountUGX: transaction.amountUGX,
      currency: transaction.currency,
    },
    contactUnlock,
    failureReason: ['FAILED', 'CANCELLED', 'EXPIRED'].includes(transaction.status)
      ? 'Payment was not completed.'
      : undefined,
  });
});

router.post('/webhook/:provider', async (req, res) => {
  const verified = await paymentService.verifyWebhook({
    headers: req.headers,
    body: req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {},
  }, req.params.provider);

  if (!verified.success) {
    return res.status(401).json({ error: verified.failureReason || 'Invalid payment webhook.' });
  }

  // Acknowledge a valid signed event immediately. Re-query PesaJet in the
  // background before recording a success or unlocking landlord contact.
  res.status(200).json({ received: true });
  void paymentService.processVerifiedWebhook(verified).catch(error => {
    console.error('PesaJet webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
  });
});

if (process.env.NODE_ENV !== 'production' && process.env.PAYMENT_PROVIDER?.toLowerCase() === 'sandbox') {
  router.post('/dev/payments/:id/simulate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const transaction = db.getTransactionById(req.params.id);
    if (!transaction || (transaction.tenantId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    if (transaction.provider !== 'SANDBOX' || !['PENDING', 'PROCESSING'].includes(transaction.status)) {
      return res.status(409).json({ error: 'Payment cannot be simulated.' });
    }
    try {
      const result = await paymentService.completeAndVerifyTransaction(transaction.id);
      return res.json({ status: result.transaction.status });
    } catch {
      return res.status(503).json({ error: 'Sandbox simulation is unavailable.' });
    }
  });
}

router.get('/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const transactions = db.getTransactionsByTenant(req.user!.id).map(transaction => {
    const property = db.getPropertyById(transaction.propertyId);
    return {
      id: transaction.id,
      propertyId: transaction.propertyId,
      amountUGX: transaction.amountUGX,
      currency: transaction.currency,
      provider: transaction.provider,
      internalReference: transaction.internalReference,
      status: transaction.status,
      payerPhoneMasked: transaction.payerPhoneMasked,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      propertyTitle: property?.title || 'Rental Property',
      propertySlug: property?.slug || '',
    };
  });
  return res.json({ transactions });
});

router.get('/unlocks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const unlocks = db.getContactUnlocksByTenant(req.user!.id).map(unlock => {
    const property = db.getPropertyById(unlock.propertyId);
    let contact;
    try {
      contact = db.resolvePropertyContact(unlock.propertyId);
    } catch {
      contact = undefined;
    }
    return {
      id: unlock.id,
      tenantId: unlock.tenantId,
      propertyId: unlock.propertyId,
      transactionId: unlock.transactionId,
      status: unlock.status,
      unlockedAt: unlock.unlockedAt,
      createdAt: unlock.createdAt,
      revealedPhone: contact?.phone || '',
      revealedLandlordName: contact?.name || 'Contact temporarily unavailable',
      contactRole: contact?.role || unlock.contactRole,
      callUrl: contact?.callUrl || '',
      whatsappUrl: contact?.whatsappUrl || '',
      whatsappEnabled: contact?.whatsappEnabled || false,
      property: property ? {
        id: property.id,
        slug: property.slug,
        title: property.title,
        monthlyRentUGX: property.monthlyRentUGX,
        location: {
          district: property.location.district,
          cityOrTown: property.location.cityOrTown,
          neighborhood: property.location.neighborhood,
          mainRoadReference: property.location.mainRoadReference,
          distanceFromMainRoadMeters: property.location.distanceFromMainRoadMeters,
          publicDescription: property.location.publicDescription,
        },
        image: property.images[0]?.url || '',
      } : null,
    };
  });
  return res.json({ unlocks });
});

export default router;
