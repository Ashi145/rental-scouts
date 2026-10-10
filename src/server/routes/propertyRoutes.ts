import crypto from 'crypto';
import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { Property, PropertyStatus } from '../db/schema.ts';
import { isValidUgandanPhone, normalizeUgandanPhone } from '../auth/authService.ts';
import { toAdminProperty, toOwnerProperty, toPublicProperty, toUnlockedProperty } from '../serializers.ts';

const router = Router();

// GET all properties (Public search with filters)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const {
    propertyType,
    district,
    minRent,
    maxRent,
    bedrooms,
    q,
    sort,
  } = req.query;

  let properties = db.getAllProperties({
    status: 'APPROVED',
    propertyType: propertyType ? String(propertyType) : undefined,
    district: district ? String(district) : undefined,
    minRent: minRent ? Number(minRent) : undefined,
    maxRent: maxRent ? Number(maxRent) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    searchQuery: q ? String(q) : undefined,
  });

  // Sorting
  if (sort === 'lowest_rent') {
    properties.sort((a, b) => a.monthlyRentUGX - b.monthlyRentUGX);
  } else if (sort === 'highest_rent') {
    properties.sort((a, b) => b.monthlyRentUGX - a.monthlyRentUGX);
  } else if (sort === 'closest_road') {
    properties.sort((a, b) => a.location.distanceFromMainRoadMeters - b.location.distanceFromMainRoadMeters);
  } else if (sort === 'featured') {
    properties.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  } else {
    // Default newest
    properties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Sanitize for public response: Attach landlord verified badge, strip landlord phone completely
  const userFavorites = req.user ? new Set(db.getFavoritesByUser(req.user.id).map(f => f.propertyId)) : new Set();
  const userUnlocks = req.user ? new Set(db.getContactUnlocksByTenant(req.user.id).map(u => u.propertyId)) : new Set();

  const sanitized = properties.map(p => toPublicProperty(
    p,
    db.getLandlordProfileByUserId(p.landlordId),
    db.findUserById(p.landlordId),
    { contactUnlocked: userUnlocks.has(p.id), isFavorite: userFavorites.has(p.id) },
  ));

  return res.json({
    properties: sanitized,
    total: sanitized.length,
  });
});

// GET Single Property by ID or Slug
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  // If draft/pending and viewer is not the owner or admin, block
  if (property.status !== 'APPROVED' && (!req.user || (req.user.id !== property.landlordId && req.user.role !== 'ADMIN'))) {
    return res.status(404).json({ error: 'Property is pending review or currently unavailable.' });
  }

  db.incrementPropertyViews(property.id);

  const landlordPrf = db.getLandlordProfileByUserId(property.landlordId);
  const landlordUser = db.findUserById(property.landlordId);

  const isFavorite = req.user ? !!db.getFavoritesByUser(req.user.id).find(f => f.propertyId === property.id) : false;
  const isOwner = req.user?.id === property.landlordId;
  const isAdmin = req.user?.role === 'ADMIN';
  const unlockRecord = req.user ? db.getContactUnlock(req.user.id, property.id) : undefined;
  if (isOwner || isAdmin || unlockRecord) {
    try {
      const contact = db.resolvePropertyContact(property.id);
      return res.json({ property: { ...toUnlockedProperty(property, contact, landlordPrf, landlordUser), isFavorite } });
    } catch {
      return res.json({
        property: { ...toPublicProperty(property, landlordPrf, landlordUser, { isFavorite }), contactUnlocked: false },
      });
    }
  }

  return res.json({ property: toPublicProperty(property, landlordPrf, landlordUser, { isFavorite }) });
});

// Dedicated Protected Endpoint: GET /api/properties/:id/contact (Section 14 & 16)
router.get('/:id/contact', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const user = req.user!;
  const isOwner = user.id === property.landlordId;
  const isAdmin = user.role === 'ADMIN';
  const unlockRecord = db.getContactUnlock(user.id, property.id);

  if (!isOwner && !isAdmin && !unlockRecord) {
    return res.status(403).json({
      error: 'PAYMENT_REQUIRED',
      message: 'Direct landlord contact is protected. Pay the UGX 5,000 unlock fee to view phone and WhatsApp contact.',
      unlockFeeUGX: 5000,
    });
  }

  let resolved;
  try {
    resolved = db.resolvePropertyContact(property.id);
  } catch {
    return res.status(503).json({ error: 'Contact temporarily unavailable.' });
  }
  const contact = {
    name: resolved.name,
    role: resolved.role,
    phone: resolved.phone,
    callUrl: resolved.callUrl,
    whatsappUrl: resolved.whatsappUrl,
    whatsappEnabled: resolved.whatsappEnabled,
  };

  // Section 16: Contact Access Audit Logging
  db.recordAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'CONTACT_VIEWED',
    targetType: 'PROPERTY_CONTACT',
    targetId: property.id,
    details: {
      tenantId: user.id,
      propertyId: property.id,
      landlordId: property.landlordId,
      unlockId: unlockRecord?.id || 'OWNER_OR_ADMIN',
      timestamp: new Date().toISOString(),
    },
  });

  return res.json({
    propertyId: property.id,
    contact,
  });
});

// POST Create Property (Landlord or Admin)
router.post('/', requireAuth, requireRole(['LANDLORD', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      propertyType,
      monthlyRentUGX,
      securityDepositUGX,
      bedrooms,
      bathrooms,
      squareMeters,
      furnished,
      availableFrom,
      amenities,
      location,
      images,
      videoUrl,
      contactRole,
      customContactPhone,
      customContactName,
    } = req.body;

    if (!title || !description || !monthlyRentUGX || !location || !location.neighborhood) {
      return res.status(400).json({ error: 'Please provide all required property details and location.' });
    }

    let normalizedCustomPhone: string | undefined = undefined;
    if (customContactPhone && customContactPhone.trim()) {
      if (!isValidUgandanPhone(customContactPhone)) {
        return res.status(400).json({ error: 'Invalid property contact phone number. Please enter a valid Ugandan phone number (e.g. 0772 123 456).' });
      }
      normalizedCustomPhone = normalizeUgandanPhone(customContactPhone);
    }

    const landlordProfile = db.getLandlordProfileByUserId(user.id);
    const initialStatus = landlordProfile?.verificationStatus === 'VERIFIED' ? 'APPROVED' : 'PENDING_REVIEW';

    const newProperty = db.createProperty({
      landlordId: user.id,
      title: title.trim(),
      description: description.trim(),
      propertyType: propertyType || '2_BEDROOM',
      monthlyRentUGX: Number(monthlyRentUGX),
      securityDepositUGX: securityDepositUGX ? Number(securityDepositUGX) : Number(monthlyRentUGX),
      bedrooms: Number(bedrooms || 1),
      bathrooms: Number(bathrooms || 1),
      squareMeters: squareMeters ? Number(squareMeters) : undefined,
      furnished: !!furnished,
      isAvailable: true,
      availableFrom: availableFrom || 'Immediately',
      amenities: Array.isArray(amenities) ? amenities : [],
      location: {
        district: location.district || 'Wakiso',
        cityOrTown: location.cityOrTown || 'Kira',
        neighborhood: location.neighborhood,
        mainRoadReference: location.mainRoadReference || 'Main Road',
        distanceFromMainRoadMeters: Number(location.distanceFromMainRoadMeters || 300),
        latitude: Number(location.latitude || 0.3476),
        longitude: Number(location.longitude || 32.5825),
        publicDescription: location.publicDescription || '',
      },
      images: Array.isArray(images) && images.length > 0 ? images : [
        {
          id: `img_${Date.now()}`,
          propertyId: '',
          url: '/src/assets/images/property_apartment_kira_1791212350054.jpg',
          caption: 'Property view',
          isPrimary: true,
          order: 0,
        },
      ],
      video: videoUrl
        ? {
            id: `vid_${Date.now()}`,
            propertyId: '',
            videoUrl,
          }
        : undefined,
      contactRole: contactRole || landlordProfile?.landlordRole || 'PROPERTY_OWNER',
      customContactPhone: normalizedCustomPhone,
      customContactName: customContactName?.trim(),
      status: initialStatus,
      isFeatured: false,
    });

    db.recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PROPERTY_CREATED',
      targetType: 'PROPERTY',
      targetId: newProperty.id,
      details: { title: newProperty.title, status: newProperty.status },
    });

    return res.status(201).json({ property: newProperty });
  } catch (err: unknown) {
    console.error('Create property error:', err);
    return res.status(500).json({ error: 'Failed to create property.' });
  }
});

// PATCH Edit Property (Owner or Admin)
router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  if (property.landlordId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: You can only edit your own properties.' });
  }

  const editableFields = new Set([
    'title', 'description', 'propertyType', 'monthlyRentUGX', 'securityDepositUGX',
    'bedrooms', 'bathrooms', 'squareMeters', 'furnished', 'availableFrom', 'amenities',
    'location', 'images', 'video', 'videoUrl', 'contactRole', 'customContactPhone', 'customContactName', 'status',
  ]);
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Object.keys(body).some(key => !editableFields.has(key))) {
    return res.status(400).json({ error: 'Request contains fields that cannot be edited.' });
  }

  const isAdmin = req.user!.role === 'ADMIN';
  const updates: Partial<Property> = {};
  for (const key of editableFields) {
    if (key in body && key !== 'videoUrl') (updates as Record<string, unknown>)[key] = body[key];
  }
  if ('videoUrl' in body) {
    const videoUrl = body.videoUrl;
    if (videoUrl === null || videoUrl === '') updates.video = undefined;
    else if (typeof videoUrl === 'string') updates.video = { id: crypto.randomUUID(), propertyId: property.id, videoUrl };
    else return res.status(400).json({ error: 'Invalid video URL.' });
  }

  if ('location' in body) {
    const location = body.location;
    const locationFields = new Set(['district', 'cityOrTown', 'neighborhood', 'mainRoadReference', 'distanceFromMainRoadMeters', 'latitude', 'longitude', 'publicDescription']);
    if (!location || typeof location !== 'object' || Object.keys(location).some(key => !locationFields.has(key))) {
      return res.status(400).json({ error: 'Location contains fields that cannot be edited.' });
    }
  }

  if ('status' in body) {
    const target = body.status as PropertyStatus;
    const validStatuses: PropertyStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'RENTED', 'ARCHIVED'];
    if (!validStatuses.includes(target)) return res.status(400).json({ error: 'Invalid property status.' });
    if (!isAdmin) {
      const ownerTransitions: PropertyStatus[] = property.status === 'APPROVED'
        ? ['RENTED', 'ARCHIVED']
        : property.status === 'RENTED'
          ? ['APPROVED', 'ARCHIVED']
          : [];
      if (!ownerTransitions.includes(target)) return res.status(403).json({ error: 'This status transition is not allowed.' });
    }
  }

  const materialFields = ['title', 'description', 'monthlyRentUGX', 'location', 'images', 'video', 'videoUrl'];
  const hasMaterialEdit = materialFields.some(key => key in body);
  if (!isAdmin && property.status === 'APPROVED' && hasMaterialEdit && body.status !== 'RENTED' && body.status !== 'ARCHIVED') {
    // Auto-approval remains disabled until an explicit admin setting is introduced.
    updates.status = 'PENDING_REVIEW';
  }

  const updated = db.updateProperty(property.id, updates);
  if (!updated) return res.status(404).json({ error: 'Property not found.' });
  return res.json({ property: isAdmin ? toAdminProperty(updated) : toOwnerProperty(updated) });
});

// DELETE Property (Owner or Admin)
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  if (property.landlordId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: You can only delete your own properties.' });
  }

  db.deleteProperty(property.id);
  return res.json({ success: true, message: 'Property archived successfully.' });
});

// Favorites Toggle
router.post('/:id/favorite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const property = db.getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }
  const fav = db.addFavorite(req.user!.id, property.id);
  return res.json({ success: true, favorite: fav });
});

router.delete('/:id/favorite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.removeFavorite(req.user!.id, req.params.id);
  return res.json({ success: true });
});

export default router;
