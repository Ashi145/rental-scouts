export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export type LandlordRole = 'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface LandlordProfile {
  id: string;
  userId: string;
  businessName?: string;
  landlordRole: LandlordRole;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  nationalIdNumberMasked?: string;
  ownershipProofType?: string;
  verificationSubmittedAt?: string;
  verifiedAt?: string;
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
  latitude?: number;
  longitude?: number;
  exactLocation?: boolean;
  approximateLocation?: {
    mode: 'APPROX';
    lat: number;
    lng: number;
    radiusMeters: number;
  };
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
  landlordId?: string;
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
  hasVideo?: boolean;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'RENTED' | 'ARCHIVED';
  isFeatured: boolean;
  viewCount: number;
  favoriteCount?: number;
  unlockCount?: number;
  createdAt: string;
  contactRole?: LandlordRole;
  customContactPhone?: string;
  customContactName?: string;
  landlord: {
    id: string;
    displayName: string;
    isVerified: boolean;
    bio?: string;
    totalListingsCount?: number;
  };
  contactUnlocked?: boolean;
  landlordContact?: {
    phone: string | null;
    name: string | null;
    role?: LandlordRole;
    callUrl?: string;
    whatsappUrl?: string;
    whatsappEnabled: boolean;
  } | null;
  isFavorite?: boolean;
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
  revealedPhone: string;
  revealedLandlordName: string;
  contactRole: LandlordRole;
  callUrl: string;
  whatsappUrl: string;
  whatsappEnabled: boolean;
  property?: {
    id: string;
    slug: string;
    title: string;
    monthlyRentUGX: number;
    location: PropertyLocation;
    image: string;
  } | null;
}

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  propertyId: string;
  landlordId: string;
  amountUGX: number;
  currency: string;
  provider: string;
  internalReference: string;
  providerTransactionId?: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  payerPhoneMasked: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  propertyTitle?: string;
  propertySlug?: string;
  tenantName?: string;
  tenantEmail?: string;
  landlordName?: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  reporterEmail: string;
  propertyId: string;
  landlordId: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string;
  createdAt: string;
  propertyTitle?: string;
  landlordName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  tenants: number;
  landlords: number;
  totalProperties: number;
  approvedProperties: number;
  pendingProperties: number;
  rentedProperties: number;
  verifiedLandlords: number;
  totalUnlocks: number;
  totalRevenueUGX: number;
  openReports: number;
  transactionCount: number;
  successfulTransactionCount: number;
}
