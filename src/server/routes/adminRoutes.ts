import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// Strict RBAC: Admin only
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// GET Analytics & Revenue
router.get('/analytics', (req: AuthenticatedRequest, res: Response) => {
  const analytics = db.getAdminAnalytics();
  return res.json({ analytics });
});

// GET All Users
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsers().map(u => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safe } = u;
    return safe;
  });
  return res.json({ users });
});

// PATCH User Status (Suspend / Reactivate)
router.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { isActive } = req.body;
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent suspending oneself
  if (user.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot modify your own administrative status.' });
  }

  const updated = db.updateUser(user.id, { isActive: !!isActive });

  db.recordAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
    targetType: 'USER',
    targetId: user.id,
    details: { email: user.email },
  });

  return res.json({ success: true, user: updated });
});

// GET All Landlords with Profile Details
router.get('/landlords', (req: AuthenticatedRequest, res: Response) => {
  const profiles = db.getAllLandlordProfiles();
  const enriched = profiles.map(p => {
    const user = db.findUserById(p.userId);
    return {
      ...p,
      userEmail: user?.email,
      userName: user?.fullName,
      userPhone: user?.phone,
      isUserActive: user?.isActive,
    };
  });
  return res.json({ landlords: enriched });
});

// PATCH Landlord Verification Status
router.patch('/landlords/:id/verification', (req: AuthenticatedRequest, res: Response) => {
  const { status, rejectionReason } = req.body;
  const profile = db.getLandlordProfileById(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Landlord profile not found.' });
  }

  const updated = db.updateLandlordProfile(profile.userId, {
    verificationStatus: status,
    verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : undefined,
    verifiedBy: status === 'VERIFIED' ? req.user!.id : undefined,
    rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
  });

  // Notify landlord
  db.createNotification({
    userId: profile.userId,
    title: status === 'VERIFIED' ? 'Landlord Profile Verified!' : 'Landlord Verification Update',
    message: status === 'VERIFIED'
      ? 'Congratulations! Your landlord profile has been verified with a badge.'
      : `Verification update: ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
    type: status === 'VERIFIED' ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
    linkUrl: '/dashboard/landlord',
  });

  db.recordAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: `LANDLORD_${status}`,
    targetType: 'LANDLORD_PROFILE',
    targetId: profile.id,
    details: { rejectionReason },
  });

  return res.json({ success: true, profile: updated });
});

// GET All Properties for Moderation
router.get('/properties', (req: AuthenticatedRequest, res: Response) => {
  const properties = db.getAllProperties();
  const enriched = properties.map(p => {
    const landlordPrf = db.getLandlordProfileByUserId(p.landlordId);
    const landlordUser = db.findUserById(p.landlordId);
    return {
      ...p,
      landlord: {
        id: p.landlordId,
        displayName: landlordPrf?.businessName || landlordUser?.fullName || 'Landlord',
        email: landlordUser?.email,
        phone: landlordPrf?.publicContactPhone || landlordUser?.phone,
        isVerified: landlordPrf?.verificationStatus === 'VERIFIED',
      },
    };
  });
  return res.json({ properties: enriched });
});

// PATCH Property Status (Approve / Reject / Feature)
router.patch('/properties/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { status, isFeatured, rejectionReason } = req.body;
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === 'APPROVED') {
      updates.publishedAt = new Date().toISOString();
    }
  }
  if (isFeatured !== undefined) {
    updates.isFeatured = isFeatured;
  }
  if (rejectionReason !== undefined) {
    updates.rejectionReason = rejectionReason;
  }

  const updated = db.updateProperty(property.id, updates);

  // Notify landlord
  if (status && status !== property.status) {
    db.createNotification({
      userId: property.landlordId,
      title: status === 'APPROVED' ? 'Property Approved!' : `Property Status: ${status}`,
      message: status === 'APPROVED'
        ? `Your listing "${property.title}" has been approved and is now live for tenants to discover.`
        : `Your listing "${property.title}" status is now ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
      type: status === 'APPROVED' ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
      linkUrl: `/property/${property.slug}`,
    });

    db.recordAuditLog({
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: `PROPERTY_${status}`,
      targetType: 'PROPERTY',
      targetId: property.id,
      details: { title: property.title, rejectionReason },
    });
  }

  return res.json({ success: true, property: updated });
});

// GET Transactions (Payment Reconciliation)
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const transactions = db.getAllTransactions();
  const enriched = transactions.map(t => {
    const tenant = db.findUserById(t.tenantId);
    const landlord = db.findUserById(t.landlordId);
    const prop = db.getPropertyById(t.propertyId);

    return {
      ...t,
      tenantName: tenant?.fullName || 'Tenant',
      tenantEmail: tenant?.email || '',
      landlordName: landlord?.fullName || 'Landlord',
      propertyTitle: prop?.title || 'Rental Property',
    };
  });

  return res.json({ transactions: enriched });
});

// GET All Fraud & Scam Reports
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  const reports = db.getAllReports();
  const enriched = reports.map(r => {
    const prop = db.getPropertyById(r.propertyId);
    const landlord = db.findUserById(r.landlordId);
    return {
      ...r,
      propertyTitle: prop?.title || 'Unknown Property',
      landlordName: landlord?.fullName || 'Landlord',
    };
  });
  return res.json({ reports: enriched });
});

// PATCH Report Status
router.patch('/reports/:id', (req: AuthenticatedRequest, res: Response) => {
  const { status, adminNotes } = req.body;
  const report = db.updateReport(req.params.id, {
    status,
    adminNotes,
    reviewedBy: req.user!.id,
    reviewedAt: new Date().toISOString(),
  });

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  db.recordAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'REPORT_STATUS_UPDATED',
    targetType: 'REPORT',
    targetId: report.id,
    details: { status, adminNotes },
  });

  return res.json({ success: true, report });
});

// GET Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getAllAuditLogs();
  return res.json({ logs });
});

export default router;
