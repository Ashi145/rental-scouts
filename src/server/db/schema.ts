export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export type LandlordRole = 'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER';

export type LandlordVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type PropertyStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'RENTED' | 'ARCHIVED';

export type TransactionStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REVERSED'
  | 'REFUNDED';

export type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'SANDBOX';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface LandlordProfile {
  id: string;
  userId: string;
  businessName?: string;
  landlordRole: LandlordRole;
  verificationStatus: LandlordVerificationStatus;
  nationalIdNumberMasked?: string;
  ownershipProofType?: string;
  verificationSubmittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  whatsappEnabled: boolean;
  publicContactPhone: string;
  secondaryPhone?: string;
  phoneVerified: boolean;
  bio?: string;
  totalListingsCount: number;
}

export interface PropertyLocation {
  district: string;
  cityOrTown: string;
  neighborhood: string;
  mainRoadReference: string;
  distanceFromMainRoadMeters: number;
  latitude: number;
  longitude: number;
  publicDescription: string;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  caption?: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyVideo {
  id: string;
  propertyId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export interface Property {
  id: string;
  landlordId: string;
  title: string;
  slug: string;
  description: string;
  propertyType: 'SINGLE_ROOM' | 'SELF_CONTAINED' | 'STUDIO' | '1_BEDROOM' | '2_BEDROOM' | '3_BEDROOM' | '4_PLUS_BEDROOM' | 'APARTMENT' | 'HOUSE' | 'DUPLEX' | 'HOSTEL';
  monthlyRentUGX: number;
  securityDepositUGX?: number;
  bedrooms: number;
  bathrooms: number;
  squareMeters?: number;
  furnished: boolean;
  isAvailable: boolean;
  availableFrom?: string;
  amenities: string[];
  location: PropertyLocation;
  images: PropertyImage[];
  video?: PropertyVideo;
  status: PropertyStatus;
  isFeatured: boolean;
  viewCount: number;
  favoriteCount: number;
  unlockCount: number;
  rejectionReason?: string;
  contactRole?: LandlordRole;
  customContactPhone?: string;
  customContactName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ContactUnlock {
  id: string;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  transactionId: string;
  amountUGX: number;
  currency: string;
  status: 'ACTIVE' | 'REVOKED';
  unlockedAt: string;
  createdAt: string;
  revealedPhone?: string;
  revealedLandlordName?: string;
  contactRole?: LandlordRole;
  callUrl?: string;
  whatsappUrl?: string;
  whatsappEnabled?: boolean;
}

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  amountUGX: number;
  currency: string;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'PESAPAL' | 'SANDBOX';
  providerTransactionId?: string;
  internalReference: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  payerPhoneMasked: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface Report {
  id: string;
  reporterUserId: string;
  reporterEmail: string;
  propertyId: string;
  landlordId: string;
  reason: 'FAKE_LISTING' | 'INCORRECT_LOCATION' | 'WRONG_PRICE' | 'FRAUDULENT_LANDLORD' | 'ALREADY_RENTED' | 'SUSPICIOUS_BEHAVIOR' | 'OTHER';
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'PAYMENT_SUCCESS' | 'CONTACT_UNLOCKED' | 'PROPERTY_APPROVED' | 'PROPERTY_REJECTED' | 'REPORT_UPDATE' | 'SYSTEM';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
