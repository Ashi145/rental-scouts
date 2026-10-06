import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  LandlordProfile,
  LandlordRole,
  Property,
  ContactUnlock,
  PaymentTransaction,
  Report,
  Favorite,
  Notification,
  AuditLog,
  AuthSession,
} from './schema.ts';
import { normalizeUgandanPhone, generateCallUrl, generateWhatsAppUrl } from '../auth/authService.ts';

export interface DatabaseState {
  users: User[];
  landlords: LandlordProfile[];
  properties: Property[];
  contactUnlocks: ContactUnlock[];
  transactions: PaymentTransaction[];
  reports: Report[];
  favorites: Favorite[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  sessions: AuthSession[];
}

const DB_FILE = path.resolve(process.env.DATABASE_PATH || './var/rentalscout.db');
const DATA_DIR = path.dirname(DB_FILE);
const LEGACY_DB_FILE = path.resolve(process.cwd(), 'data/rentalscout_store.json');

// Simple secure password hasher using PBKDF2
export function hashPassword(password: string): string {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${derived}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split('$');
  if (parts.length === 4 && parts[0] === 'pbkdf2') {
    const iterations = Number(parts[1]);
    if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
    const expected = Buffer.from(parts[3], 'hex');
    const actual = crypto.pbkdf2Sync(password, parts[2], iterations, expected.length, 'sha512');
    return expected.length > 0 && crypto.timingSafeEqual(actual, expected);
  }

  // Transitional compatibility for accounts created with the original fixed-salt hasher.
  const legacy = crypto.pbkdf2Sync(password, 'rental_scout_salt_secure_2026', 10_000, 64, 'sha512');
  const expectedLegacy = Buffer.from(hash, 'hex');
  return expectedLegacy.length === legacy.length && crypto.timingSafeEqual(legacy, expectedLegacy);
}

export function isModernPasswordHash(hash: string): boolean {
  return hash.startsWith('pbkdf2$');
}

class Database {
  private state: DatabaseState = {
    users: [],
    landlords: [],
    properties: [],
    contactUnlocks: [],
    transactions: [],
    reports: [],
    favorites: [],
    notifications: [],
    auditLogs: [],
    sessions: [],
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const sourceFile = fs.existsSync(DB_FILE)
        ? DB_FILE
        : process.env.NODE_ENV !== 'production' && fs.existsSync(LEGACY_DB_FILE)
          ? LEGACY_DB_FILE
          : undefined;
      if (sourceFile) {
        const raw = fs.readFileSync(sourceFile, 'utf-8');
        this.state = JSON.parse(raw);
        this.state.sessions ??= [];
        if (process.env.NODE_ENV === 'production') {
          const seededId = (id: string) => /^(usr_admin_|usr_lnd_|usr_tnt_)/.test(id);
          this.state.users = this.state.users.filter(user => !seededId(user.id));
          const activeUserIds = new Set(this.state.users.map(user => user.id));
          this.state.landlords = this.state.landlords.filter(profile => activeUserIds.has(profile.userId));
          this.state.properties = this.state.properties.filter(property => activeUserIds.has(property.landlordId));
          const activePropertyIds = new Set(this.state.properties.map(property => property.id));
          this.state.contactUnlocks = this.state.contactUnlocks.filter(unlock => activeUserIds.has(unlock.tenantId) && activePropertyIds.has(unlock.propertyId));
          this.state.transactions = this.state.transactions.filter(transaction => activeUserIds.has(transaction.tenantId) && activePropertyIds.has(transaction.propertyId));
          this.state.favorites = this.state.favorites.filter(favorite => activeUserIds.has(favorite.userId) && activePropertyIds.has(favorite.propertyId));
        }
        this.initialized = true;
      } else {
        this.save();
        this.initialized = true;
      }
    } catch (err) {
      console.error('Failed to initialize database file; starting with an empty store.', err);
      this.initialized = true;
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database state to disk', err);
    }
  }

  public seedForDevelopment() {
    if (process.env.NODE_ENV === 'production') throw new Error('Development seeding is disabled in production.');
    if (this.state.users.length || this.state.properties.length) throw new Error('Refusing to seed a non-empty database.');
    this.seedInitialData();
    this.save();
  }

  private seedInitialData() {
    const adminId = 'usr_admin_001';
    const landlord1Id = 'usr_lnd_001';
    const landlord2Id = 'usr_lnd_002';
    const landlord3Id = 'usr_lnd_003';
    const tenant1Id = 'usr_tnt_001';
    const tenant2Id = 'usr_tnt_002';
    const seedPasswords = new Map([landlord1Id, landlord2Id, landlord3Id, tenant1Id, tenant2Id].map(id => [id, crypto.randomBytes(24).toString('base64url')]));

    const now = new Date().toISOString();

    // 1. Users
    const users: User[] = [
      {
        id: landlord1Id,
        email: 'landlord.1@rental-scout.local',
        passwordHash: hashPassword(seedPasswords.get(landlord1Id)!),
        fullName: 'Kasule David',
        phone: '+256701555888',
        role: 'LANDLORD',
        avatarUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: landlord2Id,
        email: 'landlord.2@rental-scout.local',
        passwordHash: hashPassword(seedPasswords.get(landlord2Id)!),
        fullName: 'Grace Mirembe',
        phone: '+256782333444',
        role: 'LANDLORD',
        avatarUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: landlord3Id,
        email: 'landlord.pending@rental-scout.local',
        passwordHash: hashPassword(seedPasswords.get(landlord3Id)!),
        fullName: 'Ronald Kato',
        phone: '+256755123987',
        role: 'LANDLORD',
        avatarUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: tenant1Id,
        email: 'tenant.1@rental-scout.local',
        passwordHash: hashPassword(seedPasswords.get(tenant1Id)!),
        fullName: 'Arthur Kyeyune',
        phone: '+256778900123',
        role: 'TENANT',
        avatarUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: tenant2Id,
        email: 'tenant.2@rental-scout.local',
        passwordHash: hashPassword(seedPasswords.get(tenant2Id)!),
        fullName: 'Sarah Nakato',
        phone: '+256704112233',
        role: 'TENANT',
        avatarUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 2. Landlord Profiles
    const landlords: LandlordProfile[] = [
      {
        id: 'prf_lnd_001',
        userId: landlord1Id,
        businessName: 'Kasule Prime Properties Ltd',
        landlordRole: 'PROPERTY_OWNER',
        verificationStatus: 'VERIFIED',
        nationalIdNumberMasked: 'CM98****1290K',
        ownershipProofType: 'Land Title & Local Council LC1 Letter',
        verificationSubmittedAt: '2026-08-10T10:00:00.000Z',
        verifiedAt: '2026-08-11T14:30:00.000Z',
        verifiedBy: adminId,
        whatsappEnabled: true,
        publicContactPhone: '+256701555888',
        secondaryPhone: '+256772111222',
        phoneVerified: true,
        bio: 'Property owner and developer in Wakiso and Kampala since 2018. Focused on secure, well-finished family apartments with reliable utilities.',
        totalListingsCount: 2,
      },
      {
        id: 'prf_lnd_002',
        userId: landlord2Id,
        businessName: 'Mirembe Residences',
        landlordRole: 'LANDLADY',
        verificationStatus: 'VERIFIED',
        nationalIdNumberMasked: 'CF87****4455M',
        ownershipProofType: 'Mailo Land Title Document',
        verificationSubmittedAt: '2026-08-15T09:00:00.000Z',
        verifiedAt: '2026-08-16T11:00:00.000Z',
        verifiedBy: adminId,
        whatsappEnabled: true,
        publicContactPhone: '+256782333444',
        secondaryPhone: '',
        phoneVerified: true,
        bio: 'Providing quiet, executive residences in Naalya and Ntinda with dedicated compound managers and 24/7 security.',
        totalListingsCount: 2,
      },
      {
        id: 'prf_lnd_003',
        userId: landlord3Id,
        businessName: 'Kato Holdings',
        landlordRole: 'LANDLORD',
        verificationStatus: 'PENDING',
        nationalIdNumberMasked: 'CM92****8821R',
        ownershipProofType: 'Tenancy Sales Agreement',
        verificationSubmittedAt: now,
        whatsappEnabled: false,
        publicContactPhone: '+256755123987',
        secondaryPhone: '',
        phoneVerified: true,
        bio: 'New property developer in Kyanja.',
        totalListingsCount: 1,
      },
    ];

    // 3. Properties (using generated assets)
    const properties: Property[] = [
      {
        id: 'prop_kira_001',
        landlordId: landlord1Id,
        title: 'Modern 2 Bedroom Apartment in Kira Town',
        slug: 'modern-2-bedroom-apartment-in-kira-town',
        description: 'Immaculately finished 2-bedroom, 2-bathroom rental apartment situated in a peaceful residential close in Kira. Features a bright open-plan living room leading to a private balcony with panoramic green views, fitted kitchen cabinets with granite countertops, self-contained master bedroom with built-in wardrobes, private Umeme Yaka electricity meter, and a heavy-duty NWSC water reservoir. Gated compound with 24/7 security guard.',
        propertyType: '2_BEDROOM',
        monthlyRentUGX: 650000,
        securityDepositUGX: 650000,
        bedrooms: 2,
        bathrooms: 2,
        squareMeters: 85,
        furnished: false,
        isAvailable: true,
        availableFrom: 'Immediately',
        amenities: [
          'Security Guard 24/7',
          'Paved Compound',
          'Balcony with Scenic View',
          'Dedicated Umeme Yaka Meter',
          'NWSC Water + Overhead Tank',
          'In-built Wardrobes',
          'Ample Vehicle Parking',
          'CCTV Cameras in Common Areas',
          'Perimeter Wall & Electric Fence',
        ],
        location: {
          district: 'Wakiso',
          cityOrTown: 'Kira Municipality',
          neighborhood: 'Kira Town (Near Kira Police Post)',
          mainRoadReference: 'Kira - Kasangati Main Tarmac Road',
          distanceFromMainRoadMeters: 450,
          latitude: 0.3951,
          longitude: 32.6398,
          publicDescription: 'Only 450 meters off the Kira - Kasangati tarmac road via a well-graded murram road with solar street lights.',
        },
        images: [
          {
            id: 'img_k1',
            propertyId: 'prop_kira_001',
            url: '/src/assets/images/property_apartment_kira_1791212350054.jpg',
            caption: 'Bright living room with private balcony door and morning sunlight',
            isPrimary: true,
            order: 0,
          },
          {
            id: 'img_k2',
            propertyId: 'prop_kira_001',
            url: '/src/assets/images/hero_rental_kampala_1791212335872.jpg',
            caption: 'Exterior building facade and balcony terraces',
            isPrimary: false,
            order: 1,
          },
        ],
        video: {
          id: 'vid_k1',
          propertyId: 'prop_kira_001',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnailUrl: '/src/assets/images/property_apartment_kira_1791212350054.jpg',
          durationSeconds: 45,
        },
        status: 'APPROVED',
        isFeatured: true,
        viewCount: 342,
        favoriteCount: 28,
        unlockCount: 14,
        createdAt: '2026-09-12T08:00:00.000Z',
        updatedAt: '2026-09-12T08:00:00.000Z',
        publishedAt: '2026-09-12T09:00:00.000Z',
      },
      {
        id: 'prop_naalya_002',
        landlordId: landlord2Id,
        title: 'Serene 3 Bedroom Townhouse with Garden in Naalya',
        slug: 'serene-3-bedroom-townhouse-with-garden-in-naalya',
        description: 'Exquisite 3-bedroom semi-detached townhouse inside a gated estate of only 4 units in Naalya Estate. Features a manicured front grass garden with tropical palms, paved cabro driveway, generous kitchen pantry, master suite with walk-in closet, dedicated domestic staff quarters (DSQ), and perimeter electric fencing. Highly accessible to Metroplex Mall and the Northern Bypass.',
        propertyType: 'HOUSE',
        monthlyRentUGX: 1300000,
        securityDepositUGX: 1300000,
        bedrooms: 3,
        bathrooms: 3,
        squareMeters: 140,
        furnished: false,
        isAvailable: true,
        availableFrom: 'End of Month',
        amenities: [
          'Private Garden',
          'Paved Driveway',
          'Perimeter Wall & Electric Fence',
          'CCTV Surveillance',
          'Domestic Quarters (Boys Quarters)',
          'High Pressure Water Pump',
          'Fiber Internet Ready',
          'Pet Friendly',
        ],
        location: {
          district: 'Wakiso',
          cityOrTown: 'Kira Municipality',
          neighborhood: 'Naalya Estate (Near Mogas)',
          mainRoadReference: 'Northern Bypass / Naalya-Namugongo Road',
          distanceFromMainRoadMeters: 280,
          latitude: 0.3621,
          longitude: 32.6482,
          publicDescription: 'Conveniently located 280 meters from the main tarmac road, 3 minutes drive to Metroplex Shopping Center.',
        },
        images: [
          {
            id: 'img_n1',
            propertyId: 'prop_naalya_002',
            url: '/src/assets/images/property_house_naalya_1791212362283.jpg',
            caption: 'Gated townhouse facade with paved driveway and palm landscaping',
            isPrimary: true,
            order: 0,
          },
          {
            id: 'img_n2',
            propertyId: 'prop_naalya_002',
            url: '/src/assets/images/hero_rental_kampala_1791212335872.jpg',
            caption: 'Surrounding green hills and quiet residential ambiance',
            isPrimary: false,
            order: 1,
          },
        ],
        video: {
          id: 'vid_n1',
          propertyId: 'prop_naalya_002',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: '/src/assets/images/property_house_naalya_1791212362283.jpg',
          durationSeconds: 60,
        },
        status: 'APPROVED',
        isFeatured: true,
        viewCount: 512,
        favoriteCount: 45,
        unlockCount: 19,
        createdAt: '2026-09-18T10:15:00.000Z',
        updatedAt: '2026-09-18T10:15:00.000Z',
        publishedAt: '2026-09-18T11:00:00.000Z',
      },
      {
        id: 'prop_ntinda_003',
        landlordId: landlord2Id,
        title: 'Executive Studio Loft Apartment in Ntinda',
        slug: 'executive-studio-loft-apartment-in-ntinda',
        description: 'Chic, contemporary studio apartment tailored for working professionals or graduate students. Located in Ntinda off Ministers Village. Offers open-plan living with modern kitchenette, induction hub ready, hot water heater in shower, fiber optic cabling, and secure parking slot.',
        propertyType: 'STUDIO',
        monthlyRentUGX: 500000,
        securityDepositUGX: 500000,
        bedrooms: 1,
        bathrooms: 1,
        squareMeters: 42,
        furnished: false,
        isAvailable: true,
        availableFrom: 'Immediately',
        amenities: [
          'High Speed Internet Ready',
          'Hot Water Shower Heater',
          'Paved Parking Slot',
          'Security Guard Night & Day',
          'NWSC Water + Reserve Tank',
          'Separate Yaka Meter',
        ],
        location: {
          district: 'Kampala',
          cityOrTown: 'Nakawa Division',
          neighborhood: 'Ntinda (Ministers Village)',
          mainRoadReference: 'Ntinda - Nakawa Main Road',
          distanceFromMainRoadMeters: 180,
          latitude: 0.3541,
          longitude: 32.6175,
          publicDescription: 'Superb central location, 180 meters from tarmac road, easy walking distance to Ntinda shopping center and taxi stage.',
        },
        images: [
          {
            id: 'img_st1',
            propertyId: 'prop_ntinda_003',
            url: '/src/assets/images/property_studio_ntinda_1791212372657.jpg',
            caption: 'Open plan studio layout with fitted kitchenette and polished floor',
            isPrimary: true,
            order: 0,
          },
        ],
        status: 'APPROVED',
        isFeatured: false,
        viewCount: 289,
        favoriteCount: 19,
        unlockCount: 8,
        createdAt: '2026-09-22T14:00:00.000Z',
        updatedAt: '2026-09-22T14:00:00.000Z',
        publishedAt: '2026-09-22T14:30:00.000Z',
      },
      {
        id: 'prop_kololo_004',
        landlordId: landlord1Id,
        title: 'Luxury 3-Bedroom Penthouse in Upper Kololo',
        slug: 'luxury-3-bedroom-penthouse-in-upper-kololo',
        description: 'Prime diplomatic residence in Upper Kololo featuring 3 en-suite bedrooms, imported Italian tile finishes, elevator access, communal swimming pool, fitness gym, standby automatic diesel generator, and high security perimeter.',
        propertyType: 'APARTMENT',
        monthlyRentUGX: 3500000,
        securityDepositUGX: 3500000,
        bedrooms: 3,
        bathrooms: 3,
        squareMeters: 190,
        furnished: true,
        isAvailable: true,
        availableFrom: 'Next Month',
        amenities: [
          'Swimming Pool',
          'Gymnasium',
          'Standby Diesel Generator',
          'Elevator Access',
          '2 Assigned Underground Parking Spots',
          'Intercom System',
          'High Level Security Protocol',
        ],
        location: {
          district: 'Kampala',
          cityOrTown: 'Central Division',
          neighborhood: 'Upper Kololo',
          mainRoadReference: 'Kololo Prince Charles Drive',
          distanceFromMainRoadMeters: 50,
          latitude: 0.3312,
          longitude: 32.5954,
          publicDescription: 'Direct access on quiet residential avenue in Upper Kololo, 50m from main diplomatic artery.',
        },
        images: [
          {
            id: 'img_kolo1',
            propertyId: 'prop_kololo_004',
            url: '/src/assets/images/hero_rental_kampala_1791212335872.jpg',
            caption: 'Kololo residential terrace with panoramic Kampala skyline',
            isPrimary: true,
            order: 0,
          },
        ],
        status: 'APPROVED',
        isFeatured: true,
        viewCount: 620,
        favoriteCount: 68,
        unlockCount: 22,
        createdAt: '2026-09-25T11:00:00.000Z',
        updatedAt: '2026-09-25T11:00:00.000Z',
        publishedAt: '2026-09-25T12:00:00.000Z',
      },
      {
        id: 'prop_kyanja_005',
        landlordId: landlord3Id,
        title: 'Cozy 1 Bedroom Self-Contained Unit in Kyanja',
        slug: 'cozy-1-bedroom-self-contained-unit-in-kyanja',
        description: 'Affordable and brand new 1-bedroom self-contained house located in Kyanja Komamboga. Built-in wardrobe, tiled floors, inside bathroom with shower, secure perimeter wall with gate.',
        propertyType: '1_BEDROOM',
        monthlyRentUGX: 420000,
        securityDepositUGX: 420000,
        bedrooms: 1,
        bathrooms: 1,
        squareMeters: 38,
        furnished: false,
        isAvailable: true,
        availableFrom: 'Immediately',
        amenities: [
          'Separate Yaka Meter',
          'NWSC Water',
          'Gated Compound',
          'Car Parking Space',
        ],
        location: {
          district: 'Kampala',
          cityOrTown: 'Kawempe / Nakawa Border',
          neighborhood: 'Kyanja (Komamboga)',
          mainRoadReference: 'Kyanja - Gayaza Road',
          distanceFromMainRoadMeters: 600,
          latitude: 0.3872,
          longitude: 32.5982,
          publicDescription: '600 meters from Kyanja stage on a well-maintained murram street.',
        },
        images: [
          {
            id: 'img_kyan1',
            propertyId: 'prop_kyanja_005',
            url: '/src/assets/images/property_studio_ntinda_1791212372657.jpg',
            caption: 'Interior living and bedroom entrance',
            isPrimary: true,
            order: 0,
          },
        ],
        status: 'PENDING_REVIEW',
        isFeatured: false,
        viewCount: 42,
        favoriteCount: 3,
        unlockCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 4. Initial Seeded Transactions & Contact Unlocks (For Tenant 1)
    const transactions: PaymentTransaction[] = [
      {
        id: 'tx_seed_001',
        tenantId: tenant1Id,
        propertyId: 'prop_kira_001',
        landlordId: landlord1Id,
        amountUGX: 5000,
        currency: 'UGX',
        provider: 'MTN_MOMO',
        providerTransactionId: 'MTN-UG-99882211',
        internalReference: 'RS-TX-20260920-001',
        status: 'SUCCESS',
        paymentMethod: 'MTN_MOMO',
        payerPhoneMasked: '256778***123',
        idempotencyKey: 'idemp-seed-kira-tenant1',
        createdAt: '2026-09-20T10:14:00.000Z',
        updatedAt: '2026-09-20T10:14:35.000Z',
        completedAt: '2026-09-20T10:14:35.000Z',
        metadata: {
          note: 'Verified landlord contact unlock for Modern 2 Bedroom Apartment in Kira',
        },
      },
    ];

    const contactUnlocks: ContactUnlock[] = [
      {
        id: 'unl_seed_001',
        tenantId: tenant1Id,
        propertyId: 'prop_kira_001',
        landlordId: landlord1Id,
        transactionId: 'tx_seed_001',
        amountUGX: 5000,
        currency: 'UGX',
        status: 'ACTIVE',
        unlockedAt: '2026-09-20T10:14:35.000Z',
        createdAt: '2026-09-20T10:14:35.000Z',
        revealedPhone: '+256701555888',
        revealedLandlordName: 'Kasule David (Kasule Prime Properties)',
        contactRole: 'PROPERTY_OWNER',
        callUrl: 'tel:+256701555888',
        whatsappUrl: 'https://wa.me/256701555888',
        whatsappEnabled: true,
      },
    ];

    const favorites: Favorite[] = [
      {
        id: 'fav_001',
        userId: tenant1Id,
        propertyId: 'prop_kira_001',
        createdAt: '2026-09-19T14:20:00.000Z',
      },
      {
        id: 'fav_002',
        userId: tenant1Id,
        propertyId: 'prop_naalya_002',
        createdAt: '2026-09-21T09:10:00.000Z',
      },
    ];

    const notifications: Notification[] = [
      {
        id: 'notif_001',
        userId: tenant1Id,
        title: 'Landlord Contact Unlocked',
        message: 'You have unlocked the verified contact for "Modern 2 Bedroom Apartment in Kira Town". Tap to view landlord phone & WhatsApp.',
        type: 'CONTACT_UNLOCKED',
        isRead: false,
        linkUrl: '/property/modern-2-bedroom-apartment-in-kira-town',
        createdAt: '2026-09-20T10:14:36.000Z',
      },
      {
        id: 'notif_002',
        userId: landlord1Id,
        title: 'New Prospective Tenant Unlocked Your Contact',
        message: 'A prospective tenant paid UGX 5,000 to unlock your contact for "Modern 2 Bedroom Apartment in Kira Town". Expect a call or WhatsApp message.',
        type: 'PAYMENT_SUCCESS',
        isRead: true,
        linkUrl: '/dashboard/landlord',
        createdAt: '2026-09-20T10:14:37.000Z',
      },
    ];

    const reports: Report[] = [
      {
        id: 'rep_001',
        reporterUserId: tenant2Id,
        reporterEmail: 'tenant.2@rental-scout.local',
        propertyId: 'prop_kyanja_005',
        landlordId: landlord3Id,
        reason: 'INCORRECT_LOCATION',
        description: 'The property description states 600m from the tarmac road, but road access requires navigating a steep unpaved hill.',
        status: 'OPEN',
        createdAt: '2026-10-01T11:30:00.000Z',
        updatedAt: '2026-10-01T11:30:00.000Z',
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_001',
        actorUserId: adminId,
        actorEmail: 'admin@rental-scout.local',
        actorRole: 'ADMIN',
        action: 'PROPERTY_APPROVED',
        targetType: 'PROPERTY',
        targetId: 'prop_kira_001',
        details: { title: 'Modern 2 Bedroom Apartment in Kira Town' },
        createdAt: '2026-09-12T09:00:00.000Z',
      },
      {
        id: 'aud_002',
        actorUserId: adminId,
        actorEmail: 'admin@rental-scout.local',
        actorRole: 'ADMIN',
        action: 'LANDLORD_VERIFIED',
        targetType: 'LANDLORD_PROFILE',
        targetId: 'prf_lnd_001',
        details: { businessName: 'Kasule Prime Properties Ltd' },
        createdAt: '2026-08-11T14:30:00.000Z',
      },
    ];

    this.state = {
      users,
      landlords,
      properties,
      contactUnlocks,
      transactions,
      reports,
      favorites,
      notifications,
      auditLogs,
      sessions: [],
    };
    console.log('[seed:dev] Generated one-time development credentials for local testing:');
    for (const user of users) {
      console.log(`${user.email}: ${seedPasswords.get(user.id)}`);
    }
  }

  // --- Users & Auth ---
  public findUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public createSession(userId: string, tokenHash: string, expiresAt: string): AuthSession {
    const session: AuthSession = {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.state.sessions.push(session);
    this.save();
    return session;
  }

  public findSessionByTokenHash(tokenHash: string): AuthSession | undefined {
    const session = this.state.sessions.find(item => item.tokenHash === tokenHash);
    if (!session) return undefined;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.revokeSession(session.id);
      return undefined;
    }
    return session;
  }

  public revokeSession(id: string): void {
    const remaining = this.state.sessions.filter(session => session.id !== id);
    if (remaining.length !== this.state.sessions.length) {
      this.state.sessions = remaining;
      this.save();
    }
  }

  public revokeSessionsForUser(userId: string): void {
    const remaining = this.state.sessions.filter(session => session.userId !== userId);
    if (remaining.length !== this.state.sessions.length) {
      this.state.sessions = remaining;
      this.save();
    }
  }

  public createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
    landlordOptions?: {
      landlordRole?: LandlordRole;
      secondaryPhone?: string;
      businessName?: string;
    }
  ): User {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.state.users.push(newUser);

    if (newUser.role === 'LANDLORD') {
      const validRoles: LandlordRole[] = ['LANDLORD', 'LANDLADY', 'PROPERTY_OWNER', 'PROPERTY_MANAGER'];
      const chosenRole = landlordOptions?.landlordRole && validRoles.includes(landlordOptions.landlordRole)
        ? landlordOptions.landlordRole
        : 'LANDLORD';

      const landlordProfile: LandlordProfile = {
        id: `prf_${Date.now()}`,
        userId: id,
        businessName: landlordOptions?.businessName?.trim() || undefined,
        landlordRole: chosenRole,
        verificationStatus: 'UNVERIFIED',
        whatsappEnabled: true,
        publicContactPhone: newUser.phone,
        secondaryPhone: landlordOptions?.secondaryPhone?.trim() || '',
        phoneVerified: true,
        totalListingsCount: 0,
      };
      this.state.landlords.push(landlordProfile);
    }

    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.state.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  public getAllUsers(): User[] {
    return this.state.users;
  }

  // --- Landlords ---
  public getLandlordProfileByUserId(userId: string): LandlordProfile | undefined {
    return this.state.landlords.find(l => l.userId === userId);
  }

  public getLandlordProfileById(id: string): LandlordProfile | undefined {
    return this.state.landlords.find(l => l.id === id);
  }

  public getAllLandlordProfiles(): LandlordProfile[] {
    return this.state.landlords;
  }

  public updateLandlordProfile(userId: string, updates: Partial<LandlordProfile>): LandlordProfile | undefined {
    let profile = this.state.landlords.find(l => l.userId === userId);
    if (!profile) {
      profile = {
        id: `prf_${Date.now()}`,
        userId,
        landlordRole: 'LANDLORD',
        verificationStatus: 'UNVERIFIED',
        whatsappEnabled: true,
        publicContactPhone: '',
        secondaryPhone: '',
        phoneVerified: false,
        totalListingsCount: 0,
      };
      this.state.landlords.push(profile);
    }
    Object.assign(profile, updates);
    this.save();
    return profile;
  }

  public resolvePropertyContact(propertyId: string): {
    name: string;
    role: LandlordRole;
    phone: string;
    whatsappEnabled: boolean;
    callUrl: string;
    whatsappUrl: string;
  } {
    const prop = this.getPropertyById(propertyId);
    if (!prop) {
      throw new Error('Property not found');
    }

    const landlordUser = this.findUserById(prop.landlordId);
    const landlordPrf = this.getLandlordProfileByUserId(prop.landlordId);

    // Rule 2: If property has custom authorized contact phone, use that; otherwise default to Landlord's verified primary phone!
    if (!landlordPrf?.phoneVerified || !landlordPrf.publicContactPhone) {
      throw new Error('Verified landlord contact is unavailable.');
    }
    const rawPhone = landlordPrf.publicContactPhone;
    const name = prop.customContactName || landlordPrf?.businessName || landlordUser?.fullName || 'Property Owner';
    const role: LandlordRole = prop.contactRole || landlordPrf?.landlordRole || 'PROPERTY_OWNER';
    const whatsappEnabled = landlordPrf?.whatsappEnabled ?? true;

    const normalizedPhone = normalizeUgandanPhone(rawPhone);
    const callUrl = generateCallUrl(normalizedPhone);
    const whatsappUrl = generateWhatsAppUrl(normalizedPhone, `Hello, I am interested in your property "${prop.title}" on Rental Scout.`);

    return {
      name,
      role,
      phone: normalizedPhone,
      whatsappEnabled,
      callUrl,
      whatsappUrl,
    };
  }

  // --- Properties ---
  public getAllProperties(options?: {
    status?: string;
    propertyType?: string;
    district?: string;
    minRent?: number;
    maxRent?: number;
    bedrooms?: number;
    searchQuery?: string;
    landlordId?: string;
  }): Property[] {
    let list = [...this.state.properties];

    if (options?.landlordId) {
      list = list.filter(p => p.landlordId === options.landlordId);
    } else if (options?.status) {
      list = list.filter(p => p.status === options.status);
    }

    if (options?.propertyType && options.propertyType !== 'ALL') {
      list = list.filter(p => p.propertyType === options.propertyType);
    }

    if (options?.district && options.district !== 'ALL') {
      list = list.filter(p => 
        p.location.district.toLowerCase() === options.district?.toLowerCase() ||
        p.location.neighborhood.toLowerCase().includes(options.district?.toLowerCase() || '')
      );
    }

    if (options?.minRent) {
      list = list.filter(p => p.monthlyRentUGX >= (options.minRent || 0));
    }

    if (options?.maxRent) {
      list = list.filter(p => p.monthlyRentUGX <= (options.maxRent || 0));
    }

    if (options?.bedrooms) {
      list = list.filter(p => p.bedrooms >= (options.bedrooms || 0));
    }

    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.neighborhood.toLowerCase().includes(q) ||
        p.location.cityOrTown.toLowerCase().includes(q) ||
        p.location.district.toLowerCase().includes(q) ||
        p.location.mainRoadReference.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getPropertyById(id: string): Property | undefined {
    return this.state.properties.find(p => p.id === id || p.slug === id);
  }

  public createProperty(propertyData: Omit<Property, 'id' | 'slug' | 'viewCount' | 'favoriteCount' | 'unlockCount' | 'createdAt' | 'updatedAt'>): Property {
    const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = propertyData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;
    
    const now = new Date().toISOString();
    const newProperty: Property = {
      ...propertyData,
      id,
      slug,
      viewCount: 0,
      favoriteCount: 0,
      unlockCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.state.properties.unshift(newProperty);

    // Increment landlord listing count
    const landlordPrf = this.state.landlords.find(l => l.userId === propertyData.landlordId);
    if (landlordPrf) {
      landlordPrf.totalListingsCount = (landlordPrf.totalListingsCount || 0) + 1;
    }

    this.save();
    return newProperty;
  }

  public updateProperty(id: string, updates: Partial<Property>): Property | undefined {
    const prop = this.state.properties.find(p => p.id === id);
    if (!prop) return undefined;
    Object.assign(prop, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return prop;
  }

  public incrementPropertyViews(id: string) {
    const prop = this.state.properties.find(p => p.id === id || p.slug === id);
    if (prop) {
      prop.viewCount = (prop.viewCount || 0) + 1;
      this.save();
    }
  }

  public deleteProperty(id: string): boolean {
    const idx = this.state.properties.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.state.properties.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Contact Unlocks ---
  public getContactUnlock(tenantId: string, propertyId: string): ContactUnlock | undefined {
    return this.state.contactUnlocks.find(
      u => u.tenantId === tenantId && u.propertyId === propertyId && u.status === 'ACTIVE'
    );
  }

  public getContactUnlocksByTenant(tenantId: string): ContactUnlock[] {
    return this.state.contactUnlocks.filter(u => u.tenantId === tenantId && u.status === 'ACTIVE');
  }

  public getAllContactUnlocks(): ContactUnlock[] {
    return this.state.contactUnlocks;
  }

  public completeSuccessfulUnlock(transactionId: string, contact: {
    name: string;
    role: LandlordRole;
    phone: string;
    callUrl: string;
    whatsappUrl: string;
    whatsappEnabled: boolean;
  }): { transaction: PaymentTransaction; contactUnlock: ContactUnlock } | undefined {
    const transaction = this.state.transactions.find(tx => tx.id === transactionId || tx.internalReference === transactionId);
    if (!transaction) return undefined;
    const existingUnlock = this.state.contactUnlocks.find(unlock =>
      unlock.tenantId === transaction.tenantId && unlock.propertyId === transaction.propertyId && unlock.status === 'ACTIVE'
    );
    if (transaction.status === 'SUCCESS' && existingUnlock) return { transaction, contactUnlock: existingUnlock };
    if (!['PENDING', 'PROCESSING'].includes(transaction.status)) return undefined;

    const property = this.state.properties.find(item => item.id === transaction.propertyId);
    if (!property) return undefined;
    const now = new Date().toISOString();
    transaction.status = 'SUCCESS';
    transaction.completedAt = now;
    transaction.updatedAt = now;

    const contactUnlock: ContactUnlock = existingUnlock || {
      id: crypto.randomUUID(),
      tenantId: transaction.tenantId,
      propertyId: transaction.propertyId,
      landlordId: transaction.landlordId,
      transactionId: transaction.id,
      amountUGX: transaction.amountUGX,
      currency: transaction.currency,
      status: 'ACTIVE',
      unlockedAt: now,
      createdAt: now,
      // Phone details are deliberately resolved from current verified settings at read time.
    };
    if (!existingUnlock) {
      this.state.contactUnlocks.unshift(contactUnlock);
      property.unlockCount = (property.unlockCount || 0) + 1;
    }
    const tenantNotice: Notification = {
      id: crypto.randomUUID(), userId: transaction.tenantId, title: 'Landlord Contact Unlocked',
      message: `Contact for "${property.title}" is available in your dashboard.`, type: 'CONTACT_UNLOCKED',
      isRead: false, linkUrl: `/property/${property.slug || property.id}`, createdAt: now,
    };
    const landlordNotice: Notification = {
      id: crypto.randomUUID(), userId: transaction.landlordId, title: 'Prospective Tenant Unlocked Your Contact',
      message: `A tenant unlocked contact for "${property.title}".`, type: 'PAYMENT_SUCCESS',
      isRead: false, linkUrl: '/dashboard/landlord', createdAt: now,
    };
    this.state.notifications.unshift(tenantNotice, landlordNotice);
    this.state.auditLogs.unshift({
      id: crypto.randomUUID(), actorUserId: transaction.tenantId, action: 'CONTACT_UNLOCKED',
      targetType: 'PROPERTY', targetId: property.id,
      details: { tenantId: transaction.tenantId, landlordId: transaction.landlordId, unlockId: contactUnlock.id, transactionId: transaction.id, amountUGX: transaction.amountUGX },
      createdAt: now,
    });
    this.save();
    return { transaction, contactUnlock };
  }

  public createContactUnlock(data: Omit<ContactUnlock, 'id' | 'createdAt'>): ContactUnlock {
    const id = `unl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const unlock: ContactUnlock = {
      ...data,
      id,
      createdAt: now,
    };
    this.state.contactUnlocks.unshift(unlock);

    // Increment unlock count on property
    const prop = this.state.properties.find(p => p.id === data.propertyId);
    if (prop) {
      prop.unlockCount = (prop.unlockCount || 0) + 1;
    }

    this.save();
    return unlock;
  }

  // --- Transactions ---
  public createTransaction(data: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): PaymentTransaction {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const transaction: PaymentTransaction = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.state.transactions.unshift(transaction);
    this.save();
    return transaction;
  }

  public getTransactionById(id: string): PaymentTransaction | undefined {
    return this.state.transactions.find(t => t.id === id || t.internalReference === id);
  }

  public getTransactionByIdempotencyKey(key: string): PaymentTransaction | undefined {
    return this.state.transactions.find(t => t.idempotencyKey === key);
  }

  public getTransactionsByTenant(tenantId: string): PaymentTransaction[] {
    return this.state.transactions.filter(t => t.tenantId === tenantId);
  }

  public getAllTransactions(): PaymentTransaction[] {
    return this.state.transactions;
  }

  public updateTransaction(id: string, updates: Partial<PaymentTransaction>): PaymentTransaction | undefined {
    const tx = this.state.transactions.find(t => t.id === id || t.internalReference === id);
    if (!tx) return undefined;
    Object.assign(tx, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return tx;
  }

  // --- Favorites ---
  public getFavoritesByUser(userId: string): Favorite[] {
    return this.state.favorites.filter(f => f.userId === userId);
  }

  public addFavorite(userId: string, propertyId: string): Favorite {
    const existing = this.state.favorites.find(f => f.userId === userId && f.propertyId === propertyId);
    if (existing) return existing;

    const fav: Favorite = {
      id: `fav_${Date.now()}`,
      userId,
      propertyId,
      createdAt: new Date().toISOString(),
    };
    this.state.favorites.push(fav);

    const prop = this.state.properties.find(p => p.id === propertyId);
    if (prop) {
      prop.favoriteCount = (prop.favoriteCount || 0) + 1;
    }
    this.save();
    return fav;
  }

  public removeFavorite(userId: string, propertyId: string): boolean {
    const idx = this.state.favorites.findIndex(f => f.userId === userId && f.propertyId === propertyId);
    if (idx >= 0) {
      this.state.favorites.splice(idx, 1);
      const prop = this.state.properties.find(p => p.id === propertyId);
      if (prop && prop.favoriteCount > 0) {
        prop.favoriteCount -= 1;
      }
      this.save();
      return true;
    }
    return false;
  }

  // --- Reports ---
  public createReport(data: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Report {
    const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const report: Report = {
      ...data,
      id,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    this.state.reports.unshift(report);
    this.save();
    return report;
  }

  public getAllReports(): Report[] {
    return this.state.reports;
  }

  public updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const rep = this.state.reports.find(r => r.id === id);
    if (!rep) return undefined;
    Object.assign(rep, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return rep;
  }

  // --- Notifications ---
  public getNotificationsByUser(userId: string): Notification[] {
    return this.state.notifications.filter(n => n.userId === userId);
  }

  public createNotification(data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const notif: Notification = {
      ...data,
      id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.state.notifications.unshift(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.state.notifications.find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  // --- Audit Logging ---
  public recordAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
    return log;
  }

  public getAllAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  // --- Analytics calculation ---
  public getAdminAnalytics() {
    const totalUsers = this.state.users.length;
    const tenants = this.state.users.filter(u => u.role === 'TENANT').length;
    const landlords = this.state.users.filter(u => u.role === 'LANDLORD').length;
    const totalProperties = this.state.properties.length;
    const approvedProperties = this.state.properties.filter(p => p.status === 'APPROVED').length;
    const pendingProperties = this.state.properties.filter(p => p.status === 'PENDING_REVIEW').length;
    const rentedProperties = this.state.properties.filter(p => p.status === 'RENTED').length;
    const verifiedLandlords = this.state.landlords.filter(l => l.verificationStatus === 'VERIFIED').length;
    const totalUnlocks = this.state.contactUnlocks.length;

    const successfulTransactions = this.state.transactions.filter(t => t.status === 'SUCCESS');
    const totalRevenueUGX = successfulTransactions.reduce((acc, t) => acc + (t.amountUGX || 0), 0);
    const openReports = this.state.reports.filter(r => r.status === 'OPEN' || r.status === 'INVESTIGATING').length;

    return {
      totalUsers,
      tenants,
      landlords,
      totalProperties,
      approvedProperties,
      pendingProperties,
      rentedProperties,
      verifiedLandlords,
      totalUnlocks,
      totalRevenueUGX,
      openReports,
      transactionCount: this.state.transactions.length,
      successfulTransactionCount: successfulTransactions.length,
    };
  }
}

export const db = new Database();
