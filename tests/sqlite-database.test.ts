import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import SqliteDatabase from 'better-sqlite3';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rental-scout-sqlite-'));
const databasePath = path.join(testDirectory, 'legacy-store.json');
const legacyBackupPath = `${databasePath}.legacy.json`;

process.env.DATABASE_PATH = databasePath;

const createdAt = '2026-01-01T00:00:00.000Z';
fs.writeFileSync(databasePath, JSON.stringify({
  users: [{
    id: 'legacy-landlord', email: 'owner@example.test', passwordHash: 'hash', fullName: 'Test Owner',
    phone: '+256700000001', role: 'LANDLORD', isActive: true, createdAt, updatedAt: createdAt,
  }],
  landlords: [],
  properties: [{
    id: 'legacy-property', landlordId: 'legacy-landlord', title: 'Legacy rental', slug: 'legacy-rental',
    description: 'Imported listing', propertyType: 'STUDIO', monthlyRentUGX: 500000, bedrooms: 1, bathrooms: 1,
    furnished: false, isAvailable: true, amenities: ['Water'],
    location: { district: 'Kampala', cityOrTown: 'Kampala', neighborhood: 'Central', mainRoadReference: 'Road',
      distanceFromMainRoadMeters: 100, latitude: 0.3, longitude: 32.5, publicDescription: '' },
    images: [], status: 'APPROVED', isFeatured: false, viewCount: 0, favoriteCount: 0, unlockCount: 0,
    createdAt, updatedAt: createdAt,
  }],
  contactUnlocks: [], transactions: [], reports: [], favorites: [], notifications: [], auditLogs: [], sessions: [],
}));

const { db } = await import('../src/server/db/database.ts');

describe('SQLite database migration', () => {
  afterAll(() => {
    (db as unknown as { sql: { close: () => void } }).sql.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('preserves and imports a legacy JSON database into relational tables', () => {
    expect(fs.existsSync(legacyBackupPath)).toBe(true);
    expect(db.findUserByEmail('OWNER@example.test')?.id).toBe('legacy-landlord');
    expect(db.getPropertyById('legacy-property')?.location.district).toBe('Kampala');

    const inspection = new SqliteDatabase(databasePath, { readonly: true });
    expect(inspection.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
    expect(inspection.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(inspection.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({ version: 2 });
    expect(inspection.prepare("SELECT sql FROM sqlite_master WHERE name='contact_unlocks_one_active_idx'").get()).toMatchObject({
      sql: expect.stringContaining("WHERE status = 'ACTIVE'"),
    });
    inspection.close();
  });

  it('persists subsequent writes and enforces unique email addresses', () => {
    const created = db.createUser({
      email: 'tenant@example.test', passwordHash: 'hash', fullName: 'Test Tenant',
      phone: '+256700000002', role: 'TENANT',
    });
    expect(db.findUserById(created.id)?.email).toBe('tenant@example.test');
    expect(() => db.createUser({
      email: 'OWNER@example.test', passwordHash: 'hash', fullName: 'Duplicate Owner',
      phone: '+256700000003', role: 'TENANT',
    })).toThrow();

    const inspection = new SqliteDatabase(databasePath, { readonly: true });
    expect(inspection.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 2 });
    inspection.close();
  });
});
