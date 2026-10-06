import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

// POST Submit a Report (Fake listing, wrong price, suspicious behavior)
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, reason, description } = req.body;
  const user = req.user!;

  if (!propertyId || !reason || !description) {
    return res.status(400).json({ error: 'Property ID, reason, and detailed description are required.' });
  }

  const property = db.getPropertyById(propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const report = db.createReport({
    reporterUserId: user.id,
    reporterEmail: user.email,
    propertyId: property.id,
    landlordId: property.landlordId,
    reason,
    description: description.trim(),
  });

  db.recordAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'REPORT_SUBMITTED',
    targetType: 'PROPERTY',
    targetId: property.id,
    details: { reason },
  });

  return res.status(201).json({
    success: true,
    message: 'Report submitted. Our trust & safety team reviews every report.',
    report,
  });
});

export default router;
