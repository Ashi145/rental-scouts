import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { isValidUgandanPhone, normalizeUgandanPhone } from '../auth/authService.ts';

const router = Router();

// Ensure user is Landlord or Admin
router.use(requireAuth);
router.use(requireRole(['LANDLORD', 'ADMIN']));

// GET Landlord Properties
router.get('/properties', (req: AuthenticatedRequest, res: Response) => {
  const properties = db.getAllProperties({ landlordId: req.user!.id });
  return res.json({ properties });
});

// GET Landlord Profile & Verification Status
router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getLandlordProfileByUserId(req.user!.id);
  return res.json({ profile });
});

// PATCH Landlord Contact & Privacy Settings (Section 1, 11, 12)
router.patch('/contact-settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publicContactPhone, secondaryPhone, landlordRole, whatsappEnabled } = req.body;

    const profile = db.getLandlordProfileByUserId(req.user!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Landlord profile not found.' });
    }

    if (!publicContactPhone) {
      return res.status(400).json({ error: 'Primary phone number is required.' });
    }

    if (!isValidUgandanPhone(publicContactPhone)) {
      return res.status(400).json({ error: 'Invalid primary Ugandan phone number. Must be a valid format like 0772 123 456 or +2567...' });
    }

    const normalizedPrimary = normalizeUgandanPhone(publicContactPhone);

    let normalizedSecondary = '';
    if (secondaryPhone && secondaryPhone.trim()) {
      if (!isValidUgandanPhone(secondaryPhone)) {
        return res.status(400).json({ error: 'Invalid secondary Ugandan phone number format.' });
      }
      normalizedSecondary = normalizeUgandanPhone(secondaryPhone);
    }

    const isPhoneChanged = normalizedPrimary !== profile.publicContactPhone;

    const validRoles = ['LANDLORD', 'LANDLADY', 'PROPERTY_OWNER', 'PROPERTY_MANAGER'];
    const updatedRole = validRoles.includes(landlordRole) ? landlordRole : profile.landlordRole;

    const updated = db.updateLandlordProfile(req.user!.id, {
      publicContactPhone: normalizedPrimary,
      secondaryPhone: normalizedSecondary,
      landlordRole: updatedRole,
      whatsappEnabled: whatsappEnabled !== undefined ? !!whatsappEnabled : profile.whatsappEnabled,
      // If phone changed, require verification before unlocking
      phoneVerified: isPhoneChanged ? false : profile.phoneVerified,
    });

    db.recordAuditLog({
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'LANDLORD_CONTACT_SETTINGS_UPDATED',
      targetType: 'LANDLORD_PROFILE',
      targetId: profile.id,
      details: {
        phoneChanged: isPhoneChanged,
        newPrimaryPhone: normalizedPrimary,
        newRole: updatedRole,
      },
    });

    return res.json({
      success: true,
      message: isPhoneChanged
        ? 'Phone number updated. It will remain unavailable to tenants until SMS verification is configured.'
        : 'Contact & privacy settings updated successfully.',
      profile: updated,
      requiresPhoneVerification: isPhoneChanged,
    });
  } catch (err: unknown) {
    console.error('Update contact settings error:', err);
    return res.status(500).json({ error: 'Failed to update contact settings.' });
  }
});

// POST Verify Landlord Phone Number (Section 11)
router.post('/verify-phone', (req: AuthenticatedRequest, res: Response) => {
  return res.status(503).json({ error: 'Phone verification is temporarily unavailable.' });
});

// GET Properties with Contact Inheritance Status (Section 2 & 11)
router.get('/contact-properties', (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getLandlordProfileByUserId(req.user!.id);
  const properties = db.getAllProperties({ landlordId: req.user!.id });

  const categorized = properties.map(p => {
    const usesCustom = !!p.customContactPhone;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      monthlyRentUGX: p.monthlyRentUGX,
      location: p.location,
      usesCustomContact: usesCustom,
      effectiveContactPhone: usesCustom ? p.customContactPhone : profile?.publicContactPhone,
      effectiveContactName: usesCustom ? p.customContactName : profile?.businessName || req.user!.fullName,
      effectiveRole: p.contactRole || profile?.landlordRole || 'PROPERTY_OWNER',
    };
  });

  return res.json({ properties: categorized });
});

// POST Submit Verification Documents / Proof
router.post('/verification', (req: AuthenticatedRequest, res: Response) => {
  const { businessName, nationalIdNumber, ownershipProofType, publicContactPhone, whatsappEnabled, bio } = req.body;

  if (!nationalIdNumber || !ownershipProofType) {
    return res.status(400).json({ error: 'National ID number and ownership proof description are required.' });
  }

  // Mask ID: e.g. CM12****89K
  const maskedId = nationalIdNumber.length > 6
    ? nationalIdNumber.slice(0, 4) + '****' + nationalIdNumber.slice(-3)
    : '****';

  const updatedProfile = db.updateLandlordProfile(req.user!.id, {
    businessName: businessName?.trim() || undefined,
    verificationStatus: 'PENDING',
    nationalIdNumberMasked: maskedId,
    ownershipProofType,
    verificationSubmittedAt: new Date().toISOString(),
    publicContactPhone: publicContactPhone || req.user!.phone,
    whatsappEnabled: !!whatsappEnabled,
    bio: bio?.trim(),
  });

  db.recordAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'LANDLORD_VERIFICATION_SUBMITTED',
    targetType: 'LANDLORD_PROFILE',
    targetId: updatedProfile?.id || '',
    details: { businessName, ownershipProofType },
  });

  return res.json({
    success: true,
    message: 'Verification request submitted. Our team will review your property documentation.',
    profile: updatedProfile,
  });
});

// GET Landlord Stats
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const properties = db.getAllProperties({ landlordId: req.user!.id });
  const totalViews = properties.reduce((acc, p) => acc + (p.viewCount || 0), 0);
  const totalUnlocks = properties.reduce((acc, p) => acc + (p.unlockCount || 0), 0);

  return res.json({
    totalListings: properties.length,
    activeListings: properties.filter(p => p.status === 'APPROVED').length,
    pendingListings: properties.filter(p => p.status === 'PENDING_REVIEW').length,
    rentedListings: properties.filter(p => p.status === 'RENTED').length,
    totalViews,
    totalUnlocks,
  });
});

export default router;
