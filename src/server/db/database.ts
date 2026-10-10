import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import SqliteDatabase from 'better-sqlite3';
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

dotenv.config();

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

const DB_FILE = path.resolve(process.env.DATABASE_PATH || './var/rentalscout.sqlite');
const LEGACY_DB_FILES = [
  `${DB_FILE}.legacy.json`,
  path.resolve(process.cwd(), 'var/rentalscout.db.legacy.json'),
  path.resolve(process.cwd(), 'var/rentalscout.db'),
  path.resolve(process.cwd(), 'data/rentalscout_store.json'),
];

function preserveLegacyJsonAtDatabasePath(): void {
  if (!fs.existsSync(DB_FILE)) return;
  const fd = fs.openSync(DB_FILE, 'r');
  const header = Buffer.alloc(16);
  const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
  fs.closeSync(fd);
  if (bytesRead >= 16 && header.toString('utf8') === 'SQLite format 3\u0000') return;

  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<DatabaseState>;
    if (!Array.isArray(data.users) || !Array.isArray(data.properties)) return;
  } catch {
    return;
  }

  const backupPath = `${DB_FILE}.legacy.json`;
  if (fs.existsSync(backupPath)) {
    throw new Error(`Both ${DB_FILE} and ${backupPath} contain legacy data; move one file before starting.`);
  }
  fs.renameSync(DB_FILE, backupPath);
  console.info(`[database] Preserved legacy JSON database as ${path.relative(process.cwd(), backupPath)}.`);
}

preserveLegacyJsonAtDatabasePath();

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
  private readonly sql: InstanceType<typeof SqliteDatabase>;
  private persistedState!: DatabaseState;
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

  constructor() {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    this.sql = new SqliteDatabase(DB_FILE);
    this.sql.pragma('journal_mode = WAL');
    this.sql.pragma('foreign_keys = ON');
    this.createSchema();
    this.state = this.readState();
    this.persistedState = structuredClone(this.state);
    this.importLegacyData();
  }

  private createSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL, phone TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('TENANT','LANDLORD','ADMIN')),
        avatar_url TEXT, is_active INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS landlord_profiles (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        business_name TEXT, landlord_role TEXT NOT NULL, verification_status TEXT NOT NULL,
        national_id_number_masked TEXT, ownership_proof_type TEXT, verification_submitted_at TEXT,
        verified_at TEXT, verified_by TEXT, rejection_reason TEXT, whatsapp_enabled INTEGER NOT NULL,
        public_contact_phone TEXT NOT NULL, secondary_phone TEXT, phone_verified INTEGER NOT NULL,
        bio TEXT, total_listings_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY, landlord_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL, property_type TEXT NOT NULL,
        monthly_rent_ugx REAL NOT NULL, security_deposit_ugx REAL, bedrooms INTEGER NOT NULL,
        bathrooms INTEGER NOT NULL, square_meters REAL, furnished INTEGER NOT NULL, is_available INTEGER NOT NULL,
        available_from TEXT, amenities_json TEXT NOT NULL, location_json TEXT NOT NULL, images_json TEXT NOT NULL,
        video_json TEXT, status TEXT NOT NULL, is_featured INTEGER NOT NULL, view_count INTEGER NOT NULL,
        favorite_count INTEGER NOT NULL, unlock_count INTEGER NOT NULL, rejection_reason TEXT,
        contact_role TEXT, custom_contact_phone TEXT, custom_contact_name TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT
      );
      CREATE INDEX IF NOT EXISTS properties_status_created_idx ON properties(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS properties_landlord_idx ON properties(landlord_id);
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES users(id), property_id TEXT NOT NULL REFERENCES properties(id),
        landlord_id TEXT NOT NULL REFERENCES users(id), amount_ugx REAL NOT NULL, currency TEXT NOT NULL,
        provider TEXT NOT NULL, provider_transaction_id TEXT, internal_reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL, payment_method TEXT NOT NULL, payer_phone_masked TEXT NOT NULL,
        idempotency_key TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        completed_at TEXT, failure_reason TEXT, metadata_json TEXT,
        UNIQUE(tenant_id, idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS transactions_tenant_created_idx ON transactions(tenant_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS contact_unlocks (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES users(id), property_id TEXT NOT NULL REFERENCES properties(id),
        landlord_id TEXT NOT NULL REFERENCES users(id), transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id),
        amount_ugx REAL NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, unlocked_at TEXT NOT NULL,
        created_at TEXT NOT NULL, revealed_phone TEXT, revealed_landlord_name TEXT, contact_role TEXT,
        call_url TEXT, whatsapp_url TEXT, whatsapp_enabled INTEGER
      );
      CREATE UNIQUE INDEX IF NOT EXISTS contact_unlocks_one_active_idx
        ON contact_unlocks(tenant_id, property_id) WHERE status = 'ACTIVE';
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE, created_at TEXT NOT NULL,
        UNIQUE(user_id, property_id)
      );
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, reporter_user_id TEXT NOT NULL REFERENCES users(id), reporter_email TEXT NOT NULL,
        property_id TEXT NOT NULL REFERENCES properties(id), landlord_id TEXT NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, admin_notes TEXT,
        reviewed_by TEXT, reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL, is_read INTEGER NOT NULL,
        link_url TEXT, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY, actor_user_id TEXT, actor_email TEXT, actor_role TEXT, action TEXT NOT NULL,
        target_type TEXT NOT NULL, target_id TEXT NOT NULL, ip_address TEXT, user_agent TEXT,
        details_json TEXT, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    `);
    this.sql.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)')
      .run(1, new Date().toISOString());
    const migrationVersion = this.sql.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as { version: number | null };
    if ((migrationVersion.version ?? 0) < 2) {
      const migrateUnlockHistory = this.sql.transaction(() => {
        this.sql.exec(`
          DROP INDEX IF EXISTS contact_unlocks_one_active_idx;
          ALTER TABLE contact_unlocks RENAME TO contact_unlocks_legacy_v1;
          CREATE TABLE contact_unlocks (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES users(id), property_id TEXT NOT NULL REFERENCES properties(id),
            landlord_id TEXT NOT NULL REFERENCES users(id), transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id),
            amount_ugx REAL NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, unlocked_at TEXT NOT NULL,
            created_at TEXT NOT NULL, revealed_phone TEXT, revealed_landlord_name TEXT, contact_role TEXT,
            call_url TEXT, whatsapp_url TEXT, whatsapp_enabled INTEGER
          );
          INSERT INTO contact_unlocks SELECT * FROM contact_unlocks_legacy_v1;
          DROP TABLE contact_unlocks_legacy_v1;
          CREATE UNIQUE INDEX contact_unlocks_one_active_idx
            ON contact_unlocks(tenant_id, property_id) WHERE status = 'ACTIVE';
        `);
        this.sql.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')
          .run(2, new Date().toISOString());
      });
      migrateUnlockHistory();
    }
  }

  private mapUser(row: Record<string, unknown>): User {
    return {
      id: String(row.id), email: String(row.email), passwordHash: String(row.password_hash),
      fullName: String(row.full_name), phone: String(row.phone), role: row.role as User['role'],
      avatarUrl: row.avatar_url as string | undefined, isActive: Boolean(row.is_active),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
      lastLoginAt: row.last_login_at as string | undefined,
    };
  }

  private mapLandlord(row: Record<string, unknown>): LandlordProfile {
    return {
      id: String(row.id), userId: String(row.user_id), businessName: row.business_name as string | undefined,
      landlordRole: row.landlord_role as LandlordRole, verificationStatus: row.verification_status as LandlordProfile['verificationStatus'],
      nationalIdNumberMasked: row.national_id_number_masked as string | undefined,
      ownershipProofType: row.ownership_proof_type as string | undefined,
      verificationSubmittedAt: row.verification_submitted_at as string | undefined,
      verifiedAt: row.verified_at as string | undefined, verifiedBy: row.verified_by as string | undefined,
      rejectionReason: row.rejection_reason as string | undefined, whatsappEnabled: Boolean(row.whatsapp_enabled),
      publicContactPhone: String(row.public_contact_phone), secondaryPhone: row.secondary_phone as string | undefined,
      phoneVerified: Boolean(row.phone_verified), bio: row.bio as string | undefined,
      totalListingsCount: Number(row.total_listings_count),
    };
  }

  private mapProperty(row: Record<string, unknown>): Property {
    return {
      id: String(row.id), landlordId: String(row.landlord_id), title: String(row.title), slug: String(row.slug),
      description: String(row.description), propertyType: row.property_type as Property['propertyType'],
      monthlyRentUGX: Number(row.monthly_rent_ugx), securityDepositUGX: row.security_deposit_ugx as number | undefined,
      bedrooms: Number(row.bedrooms), bathrooms: Number(row.bathrooms), squareMeters: row.square_meters as number | undefined,
      furnished: Boolean(row.furnished), isAvailable: Boolean(row.is_available), availableFrom: row.available_from as string | undefined,
      amenities: this.parseJson(row.amenities_json as string, []),
      location: this.parseJson(row.location_json as string, {} as Property['location']),
      images: this.parseJson(row.images_json as string, []),
      video: this.parseJson(row.video_json as string | null, undefined),
      status: row.status as Property['status'], isFeatured: Boolean(row.is_featured),
      viewCount: Number(row.view_count), favoriteCount: Number(row.favorite_count), unlockCount: Number(row.unlock_count),
      rejectionReason: row.rejection_reason as string | undefined, contactRole: row.contact_role as LandlordRole | undefined,
      customContactPhone: row.custom_contact_phone as string | undefined, customContactName: row.custom_contact_name as string | undefined,
      createdAt: String(row.created_at), updatedAt: String(row.updated_at), publishedAt: row.published_at as string | undefined,
    };
  }

  private mapTransaction(row: Record<string, unknown>): PaymentTransaction {
    return {
      id: String(row.id), tenantId: String(row.tenant_id), propertyId: String(row.property_id), landlordId: String(row.landlord_id),
      amountUGX: Number(row.amount_ugx), currency: String(row.currency), provider: row.provider as PaymentTransaction['provider'],
      providerTransactionId: row.provider_transaction_id as string | undefined,
      internalReference: String(row.internal_reference), status: row.status as PaymentTransaction['status'],
      paymentMethod: row.payment_method as PaymentTransaction['paymentMethod'], payerPhoneMasked: String(row.payer_phone_masked),
      idempotencyKey: String(row.idempotency_key), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
      completedAt: row.completed_at as string | undefined, failureReason: row.failure_reason as string | undefined,
      metadata: this.parseJson(row.metadata_json as string | null, undefined),
    };
  }

  private mapUnlock(row: Record<string, unknown>): ContactUnlock {
    return {
      id: String(row.id), tenantId: String(row.tenant_id), propertyId: String(row.property_id), landlordId: String(row.landlord_id),
      transactionId: String(row.transaction_id), amountUGX: Number(row.amount_ugx), currency: String(row.currency),
      status: row.status as ContactUnlock['status'], unlockedAt: String(row.unlocked_at), createdAt: String(row.created_at),
      revealedPhone: row.revealed_phone as string | undefined, revealedLandlordName: row.revealed_landlord_name as string | undefined,
      contactRole: row.contact_role as LandlordRole | undefined, callUrl: row.call_url as string | undefined,
      whatsappUrl: row.whatsapp_url as string | undefined,
      whatsappEnabled: row.whatsapp_enabled == null ? undefined : Boolean(row.whatsapp_enabled),
    };
  }

  private mapReport(row: Record<string, unknown>): Report {
    return {
      id: String(row.id), reporterUserId: String(row.reporter_user_id), reporterEmail: String(row.reporter_email),
      propertyId: String(row.property_id), landlordId: String(row.landlord_id), reason: row.reason as Report['reason'],
      description: String(row.description), status: row.status as Report['status'], adminNotes: row.admin_notes as string | undefined,
      reviewedBy: row.reviewed_by as string | undefined, reviewedAt: row.reviewed_at as string | undefined,
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    };
  }

  private mapFavorite(row: Record<string, unknown>): Favorite {
    return { id: String(row.id), userId: String(row.user_id), propertyId: String(row.property_id), createdAt: String(row.created_at) };
  }

  private mapNotification(row: Record<string, unknown>): Notification {
    return {
      id: String(row.id), userId: String(row.user_id), title: String(row.title), message: String(row.message),
      type: row.type as Notification['type'], isRead: Boolean(row.is_read), linkUrl: row.link_url as string | undefined,
      createdAt: String(row.created_at),
    };
  }

  private mapAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: String(row.id), actorUserId: row.actor_user_id as string | undefined, actorEmail: row.actor_email as string | undefined,
      actorRole: row.actor_role as string | undefined, action: String(row.action), targetType: String(row.target_type),
      targetId: String(row.target_id), ipAddress: row.ip_address as string | undefined, userAgent: row.user_agent as string | undefined,
      details: this.parseJson(row.details_json as string | null, undefined), createdAt: String(row.created_at),
    };
  }

  private mapSession(row: Record<string, unknown>): AuthSession {
    return {
      id: String(row.id), userId: String(row.user_id), tokenHash: String(row.token_hash),
      expiresAt: String(row.expires_at), createdAt: String(row.created_at),
    };
  }

  private upsertRow(table: string, row: Record<string, string | number | null>): void {
    const columns = Object.keys(row);
    const updates = columns.filter(column => column !== 'id').map(column => `${column}=excluded.${column}`).join(',');
    const sql = `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(column => `@${column}`).join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
    this.sql.prepare(sql).run(row);
  }

  private persistChanges(previousState: DatabaseState): void {
    const currentState = this.state;
    const idOf = (value: { id: string }) => value.id;
    const definitions = {
      users: { table: 'users', insert: (value: User) => this.insertUser(value) },
      landlords: { table: 'landlord_profiles', insert: (value: LandlordProfile) => this.insertLandlord(value) },
      properties: { table: 'properties', insert: (value: Property) => this.insertProperty(value) },
      transactions: { table: 'transactions', insert: (value: PaymentTransaction) => this.insertTransaction(value) },
      contactUnlocks: { table: 'contact_unlocks', insert: (value: ContactUnlock) => this.insertUnlock(value) },
      favorites: { table: 'favorites', insert: (value: Favorite) => this.insertFavorite(value) },
      reports: { table: 'reports', insert: (value: Report) => this.insertReport(value) },
      notifications: { table: 'notifications', insert: (value: Notification) => this.insertNotification(value) },
      auditLogs: { table: 'audit_logs', insert: (value: AuditLog) => this.insertAuditLog(value) },
      sessions: { table: 'sessions', insert: (value: AuthSession) => this.insertSession(value) },
    };
    const removalOrder: (keyof typeof definitions)[] = [
      'sessions', 'notifications', 'auditLogs', 'reports', 'favorites', 'contactUnlocks',
      'transactions', 'properties', 'landlords', 'users',
    ];
    const writeOrder: (keyof typeof definitions)[] = [
      'users', 'landlords', 'properties', 'transactions', 'contactUnlocks', 'favorites',
      'reports', 'notifications', 'auditLogs', 'sessions',
    ];

    const persist = this.sql.transaction(() => {
      for (const key of removalOrder) {
        const definition = definitions[key];
        const oldRecords = previousState[key] as Array<{ id: string }>;
        const newIds = new Set((currentState[key] as Array<{ id: string }>).map(idOf));
        const remove = this.sql.prepare(`DELETE FROM ${definition.table} WHERE id = ?`);
        for (const record of oldRecords) {
          if (!newIds.has(idOf(record))) remove.run(record.id);
        }
      }

      for (const key of writeOrder) {
        const definition = definitions[key];
        const oldRecords = new Map((previousState[key] as Array<{ id: string }>).map(record => [record.id, JSON.stringify(record)]));
        for (const record of currentState[key] as Array<{ id: string }>) {
          if (oldRecords.get(record.id) !== JSON.stringify(record)) {
            (definition.insert as (value: typeof record) => void)(record);
          }
        }
      }
    });
    persist();
    this.persistedState = structuredClone(currentState);
  }

  private readState(): DatabaseState {
    const all = (table: string, orderBy = '') =>
      this.sql.prepare(`SELECT * FROM ${table}${orderBy ? ` ORDER BY ${orderBy}` : ''}`).all() as Record<string, unknown>[];
    return {
      users: all('users').map(row => this.mapUser(row)),
      landlords: all('landlord_profiles').map(row => this.mapLandlord(row)),
      properties: all('properties', 'created_at DESC, id DESC').map(row => this.mapProperty(row)),
      contactUnlocks: all('contact_unlocks', 'created_at DESC, id DESC').map(row => this.mapUnlock(row)),
      transactions: all('transactions', 'created_at DESC, id DESC').map(row => this.mapTransaction(row)),
      reports: all('reports', 'created_at DESC, id DESC').map(row => this.mapReport(row)),
      favorites: all('favorites').map(row => this.mapFavorite(row)),
      notifications: all('notifications', 'created_at DESC, id DESC').map(row => this.mapNotification(row)),
      auditLogs: all('audit_logs', 'created_at DESC, id DESC').map(row => this.mapAuditLog(row)),
      sessions: all('sessions').map(row => this.mapSession(row)),
    };
  }

  private insertUser(value: User): void {
    this.upsertRow('users', {
      id: value.id, email: value.email, password_hash: value.passwordHash, full_name: value.fullName, phone: value.phone,
      role: value.role, avatar_url: value.avatarUrl ?? null, is_active: Number(value.isActive),
      created_at: value.createdAt, updated_at: value.updatedAt, last_login_at: value.lastLoginAt ?? null,
    });
  }

  private insertLandlord(value: LandlordProfile): void {
    this.upsertRow('landlord_profiles', {
      id: value.id, user_id: value.userId, business_name: value.businessName ?? null, landlord_role: value.landlordRole,
      verification_status: value.verificationStatus, national_id_number_masked: value.nationalIdNumberMasked ?? null,
      ownership_proof_type: value.ownershipProofType ?? null, verification_submitted_at: value.verificationSubmittedAt ?? null,
      verified_at: value.verifiedAt ?? null, verified_by: value.verifiedBy ?? null, rejection_reason: value.rejectionReason ?? null,
      whatsapp_enabled: Number(value.whatsappEnabled), public_contact_phone: value.publicContactPhone,
      secondary_phone: value.secondaryPhone ?? null, phone_verified: Number(value.phoneVerified), bio: value.bio ?? null,
      total_listings_count: value.totalListingsCount,
    });
  }

  private insertProperty(value: Property): void {
    this.upsertRow('properties', {
      id: value.id, landlord_id: value.landlordId, title: value.title, slug: value.slug, description: value.description,
      property_type: value.propertyType, monthly_rent_ugx: value.monthlyRentUGX, security_deposit_ugx: value.securityDepositUGX ?? null,
      bedrooms: value.bedrooms, bathrooms: value.bathrooms, square_meters: value.squareMeters ?? null,
      furnished: Number(value.furnished), is_available: Number(value.isAvailable), available_from: value.availableFrom ?? null,
      amenities_json: JSON.stringify(value.amenities ?? []), location_json: JSON.stringify(value.location),
      images_json: JSON.stringify(value.images ?? []), video_json: value.video ? JSON.stringify(value.video) : null,
      status: value.status, is_featured: Number(value.isFeatured), view_count: value.viewCount, favorite_count: value.favoriteCount,
      unlock_count: value.unlockCount, rejection_reason: value.rejectionReason ?? null, contact_role: value.contactRole ?? null,
      custom_contact_phone: value.customContactPhone ?? null, custom_contact_name: value.customContactName ?? null,
      created_at: value.createdAt, updated_at: value.updatedAt, published_at: value.publishedAt ?? null,
    });
  }

  private insertTransaction(value: PaymentTransaction): void {
    this.upsertRow('transactions', {
      id: value.id, tenant_id: value.tenantId, property_id: value.propertyId, landlord_id: value.landlordId,
      amount_ugx: value.amountUGX, currency: value.currency, provider: value.provider,
      provider_transaction_id: value.providerTransactionId ?? null, internal_reference: value.internalReference,
      status: value.status, payment_method: value.paymentMethod, payer_phone_masked: value.payerPhoneMasked,
      idempotency_key: value.idempotencyKey, created_at: value.createdAt, updated_at: value.updatedAt,
      completed_at: value.completedAt ?? null, failure_reason: value.failureReason ?? null,
      metadata_json: value.metadata ? JSON.stringify(value.metadata) : null,
    });
  }

  private insertUnlock(value: ContactUnlock): void {
    this.upsertRow('contact_unlocks', {
      id: value.id, tenant_id: value.tenantId, property_id: value.propertyId, landlord_id: value.landlordId,
      transaction_id: value.transactionId, amount_ugx: value.amountUGX, currency: value.currency, status: value.status,
      unlocked_at: value.unlockedAt, created_at: value.createdAt, revealed_phone: value.revealedPhone ?? null,
      revealed_landlord_name: value.revealedLandlordName ?? null, contact_role: value.contactRole ?? null,
      call_url: value.callUrl ?? null, whatsapp_url: value.whatsappUrl ?? null,
      whatsapp_enabled: value.whatsappEnabled == null ? null : Number(value.whatsappEnabled),
    });
  }

  private insertFavorite(value: Favorite): void {
    this.upsertRow('favorites', { id: value.id, user_id: value.userId, property_id: value.propertyId, created_at: value.createdAt });
  }

  private insertReport(value: Report): void {
    this.upsertRow('reports', {
      id: value.id, reporter_user_id: value.reporterUserId, reporter_email: value.reporterEmail, property_id: value.propertyId,
      landlord_id: value.landlordId, reason: value.reason, description: value.description, status: value.status,
      admin_notes: value.adminNotes ?? null, reviewed_by: value.reviewedBy ?? null, reviewed_at: value.reviewedAt ?? null,
      created_at: value.createdAt, updated_at: value.updatedAt,
    });
  }

  private insertNotification(value: Notification): void {
    this.upsertRow('notifications', {
      id: value.id, user_id: value.userId, title: value.title, message: value.message, type: value.type,
      is_read: Number(value.isRead), link_url: value.linkUrl ?? null, created_at: value.createdAt,
    });
  }

  private insertAuditLog(value: AuditLog): void {
    this.upsertRow('audit_logs', {
      id: value.id, actor_user_id: value.actorUserId ?? null, actor_email: value.actorEmail ?? null,
      actor_role: value.actorRole ?? null, action: value.action, target_type: value.targetType, target_id: value.targetId,
      ip_address: value.ipAddress ?? null, user_agent: value.userAgent ?? null,
      details_json: value.details ? JSON.stringify(value.details) : null, created_at: value.createdAt,
    });
  }

  private insertSession(value: AuthSession): void {
    this.upsertRow('sessions', {
      id: value.id, user_id: value.userId, token_hash: value.tokenHash, expires_at: value.expiresAt, created_at: value.createdAt,
    });
  }

  public save(): void {
    const previousState = this.persistedState;
    try {
      this.persistChanges(previousState);
    } catch (error) {
      this.state = previousState;
      throw error;
    }
  }

  private parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }

  private importLegacyData(): void {
    const hasUsers = (this.sql.prepare('SELECT 1 FROM users LIMIT 1').get() as { 1: number } | undefined);
    if (hasUsers) return;
    for (const file of LEGACY_DB_FILES) {
      if (!fs.existsSync(file) || file === DB_FILE) continue;
      try {
        const imported = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<DatabaseState>;
        if (!Array.isArray(imported.users) || !Array.isArray(imported.properties)) continue;
        this.state = {
          users: imported.users,
          landlords: imported.landlords ?? [],
          properties: imported.properties,
          contactUnlocks: imported.contactUnlocks ?? [],
          transactions: imported.transactions ?? [],
          reports: imported.reports ?? [],
          favorites: imported.favorites ?? [],
          notifications: imported.notifications ?? [],
          auditLogs: imported.auditLogs ?? [],
          sessions: imported.sessions ?? [],
        };
        if (process.env.NODE_ENV === 'production') {
          const seeded = (id: string) => /^(usr_admin_|usr_lnd_|usr_tnt_)/.test(id);
          this.state.users = this.state.users.filter(user => !seeded(user.id));
          const userIds = new Set(this.state.users.map(user => user.id));
          this.state.landlords = this.state.landlords.filter(profile => userIds.has(profile.userId));
          this.state.properties = this.state.properties.filter(property => userIds.has(property.landlordId));
          const propertyIds = new Set(this.state.properties.map(property => property.id));
          this.state.transactions = this.state.transactions.filter(item =>
            userIds.has(item.tenantId) && userIds.has(item.landlordId) && propertyIds.has(item.propertyId));
          const transactionIds = new Set(this.state.transactions.map(item => item.id));
          this.state.contactUnlocks = this.state.contactUnlocks.filter(item =>
            userIds.has(item.tenantId) && userIds.has(item.landlordId) && propertyIds.has(item.propertyId) && transactionIds.has(item.transactionId));
          this.state.favorites = this.state.favorites.filter(item => userIds.has(item.userId) && propertyIds.has(item.propertyId));
          this.state.reports = this.state.reports.filter(item =>
            userIds.has(item.reporterUserId) && userIds.has(item.landlordId) && propertyIds.has(item.propertyId));
          this.state.notifications = this.state.notifications.filter(item => userIds.has(item.userId));
          this.state.sessions = this.state.sessions.filter(item => userIds.has(item.userId));
        }
        this.persistState(this.state);
        console.info(`[database] Imported existing records from ${path.relative(process.cwd(), file)}.`);
        return;
      } catch (error) {
        console.error(`[database] Could not import legacy data from ${file}.`, error);
        throw error;
      }
    }
  }

  private persistState(state: DatabaseState): void {
    const persist = this.sql.transaction(() => {
      this.sql.exec('DELETE FROM contact_unlocks; DELETE FROM transactions; DELETE FROM favorites; DELETE FROM reports; DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM sessions; DELETE FROM properties; DELETE FROM landlord_profiles; DELETE FROM users;');
      for (const user of state.users) this.insertUser(user);
      for (const profile of state.landlords) this.insertLandlord(profile);
      for (const property of state.properties) this.insertProperty(property);
      for (const transaction of state.transactions) this.insertTransaction(transaction);
      for (const unlock of state.contactUnlocks) this.insertUnlock(unlock);
      for (const favorite of state.favorites) this.insertFavorite(favorite);
      for (const report of state.reports) this.insertReport(report);
      for (const notification of state.notifications) this.insertNotification(notification);
      for (const log of state.auditLogs) this.insertAuditLog(log);
      for (const session of state.sessions) this.insertSession(session);
    });
    persist();
    this.persistedState = structuredClone(state);
  }

  public seedForDevelopment() {
    if (process.env.NODE_ENV === 'production') throw new Error('Development seeding is disabled in production.');
    if (this.getAllUsers().length || this.getAllProperties().length) throw new Error('Refusing to seed a non-empty database.');
    this.seedInitialData();
    this.persistState(this.state);
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
    const id = `usr_${crypto.randomUUID()}`;
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
        id: `prf_${crypto.randomUUID()}`,
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
        id: `prf_${crypto.randomUUID()}`,
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
    const id = `prop_${crypto.randomUUID()}`;
    const slug = propertyData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${crypto.randomUUID().slice(0, 8)}`;
    
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
    const property = this.state.properties.find(item => item.id === id);
    if (!property) return false;
    property.status = 'ARCHIVED';
    property.isAvailable = false;
    property.updatedAt = new Date().toISOString();
    this.save();
    return true;
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
    const id = `unl_${crypto.randomUUID()}`;
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
    const id = `tx_${crypto.randomUUID()}`;
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
      id: `fav_${crypto.randomUUID()}`,
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
    const id = `rep_${crypto.randomUUID()}`;
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
    const id = `notif_${crypto.randomUUID()}`;
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
    const id = `aud_${crypto.randomUUID()}`;
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
