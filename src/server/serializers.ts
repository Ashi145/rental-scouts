import crypto from 'crypto';
import { LandlordProfile, Property, User } from './db/schema.ts';

export interface ResolvedContact {
  name: string;
  role: string;
  phone: string;
  callUrl: string;
  whatsappUrl: string;
  whatsappEnabled: boolean;
}

function approximateLocation(property: Property) {
  const secret = process.env.LOCATION_FUZZ_SECRET;
  if (!secret || secret.length < 32) throw new Error('LOCATION_FUZZ_SECRET is not configured.');
  const digest = crypto.createHmac('sha256', secret).update(property.id).digest();
  const angle = (digest.readUInt32BE(0) / 0xffffffff) * Math.PI * 2;
  const distance = 100 + (digest.readUInt32BE(4) / 0xffffffff) * 200;
  const latitude = property.location.latitude;
  const longitude = property.location.longitude;
  const dLat = (distance * Math.cos(angle)) / 111320;
  const dLng = (distance * Math.sin(angle)) / (111320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
  return {
    mode: 'APPROX' as const,
    lat: latitude + dLat,
    lng: longitude + dLng,
    radiusMeters: 500,
  };
}

function publicFields(property: Property, landlordProfile?: LandlordProfile, landlordUser?: User) {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    description: property.description,
    propertyType: property.propertyType,
    monthlyRentUGX: property.monthlyRentUGX,
    securityDepositUGX: property.securityDepositUGX,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareMeters: property.squareMeters,
    furnished: property.furnished,
    isAvailable: property.isAvailable,
    availableFrom: property.availableFrom,
    amenities: property.amenities,
    location: {
      district: property.location.district,
      cityOrTown: property.location.cityOrTown,
      neighborhood: property.location.neighborhood,
      mainRoadReference: property.location.mainRoadReference,
      distanceFromMainRoadMeters: property.location.distanceFromMainRoadMeters,
      publicDescription: property.location.publicDescription,
      approximateLocation: approximateLocation(property),
    },
    images: property.images.map(image => ({
      url: image.url,
      caption: image.caption,
      isPrimary: image.isPrimary,
      order: image.order,
    })),
    hasVideo: Boolean(property.video),
    isFeatured: property.isFeatured,
    viewCount: property.viewCount,
    unlockCount: property.unlockCount,
    createdAt: property.createdAt,
    landlord: {
      displayName: landlordProfile?.businessName || landlordUser?.fullName || 'Verified Landlord',
      isVerified: landlordProfile?.verificationStatus === 'VERIFIED',
      bio: landlordProfile?.bio,
      totalListingsCount: landlordProfile?.totalListingsCount || 1,
    },
  };
}

export function toPublicProperty(
  property: Property,
  landlordProfile?: LandlordProfile,
  landlordUser?: User,
  extras: { contactUnlocked?: boolean; isFavorite?: boolean } = {},
) {
  return {
    ...publicFields(property, landlordProfile, landlordUser),
    contactUnlocked: extras.contactUnlocked === true,
    isFavorite: extras.isFavorite === true,
  };
}

export function toUnlockedProperty(property: Property, contact: ResolvedContact, landlordProfile?: LandlordProfile, landlordUser?: User) {
  return {
    ...publicFields(property, landlordProfile, landlordUser),
    location: {
      district: property.location.district,
      cityOrTown: property.location.cityOrTown,
      neighborhood: property.location.neighborhood,
      mainRoadReference: property.location.mainRoadReference,
      distanceFromMainRoadMeters: property.location.distanceFromMainRoadMeters,
      publicDescription: property.location.publicDescription,
      latitude: property.location.latitude,
      longitude: property.location.longitude,
      exactLocation: true,
    },
    contactUnlocked: true,
    landlordContact: {
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      callUrl: contact.callUrl,
      whatsappUrl: contact.whatsappUrl,
      whatsappEnabled: contact.whatsappEnabled,
    },
  };
}

export function toOwnerProperty(property: Property) {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    description: property.description,
    propertyType: property.propertyType,
    monthlyRentUGX: property.monthlyRentUGX,
    securityDepositUGX: property.securityDepositUGX,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareMeters: property.squareMeters,
    furnished: property.furnished,
    isAvailable: property.isAvailable,
    availableFrom: property.availableFrom,
    amenities: property.amenities,
    location: {
      district: property.location.district,
      cityOrTown: property.location.cityOrTown,
      neighborhood: property.location.neighborhood,
      mainRoadReference: property.location.mainRoadReference,
      distanceFromMainRoadMeters: property.location.distanceFromMainRoadMeters,
      publicDescription: property.location.publicDescription,
      latitude: property.location.latitude,
      longitude: property.location.longitude,
    },
    images: property.images.map(image => ({ url: image.url, caption: image.caption, isPrimary: image.isPrimary, order: image.order })),
    video: property.video ? { videoUrl: property.video.videoUrl, thumbnailUrl: property.video.thumbnailUrl, durationSeconds: property.video.durationSeconds } : undefined,
    status: property.status,
    isFeatured: property.isFeatured,
    viewCount: property.viewCount,
    favoriteCount: property.favoriteCount,
    unlockCount: property.unlockCount,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    publishedAt: property.publishedAt,
  };
}

export function toAdminProperty(property: Property) {
  return {
    ...toOwnerProperty(property),
    landlordId: property.landlordId,
    rejectionReason: property.rejectionReason,
    contactRole: property.contactRole,
    customContactPhone: property.customContactPhone,
    customContactName: property.customContactName,
  };
}
