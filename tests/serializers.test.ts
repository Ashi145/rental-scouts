import { describe, expect, it } from 'vitest';
import type { Property } from '../src/server/db/schema.ts';
import { toPublicProperty } from '../src/server/serializers.ts';

process.env.LOCATION_FUZZ_SECRET = 'unit-test-location-secret-0123456789';

const property = {
  id: 'property-test-001',
  landlordId: 'private-landlord-id',
  title: 'Test home',
  slug: 'test-home',
  description: 'A test property',
  propertyType: '2_BEDROOM',
  monthlyRentUGX: 500000,
  bedrooms: 2,
  bathrooms: 1,
  furnished: false,
  isAvailable: true,
  amenities: [],
  location: {
    district: 'Wakiso',
    cityOrTown: 'Kira',
    neighborhood: 'Test zone',
    mainRoadReference: 'Test road',
    distanceFromMainRoadMeters: 200,
    latitude: 0.3476,
    longitude: 32.5825,
    publicDescription: '',
  },
  images: [{ id: 'image-id', propertyId: 'property-test-001', url: '/safe.webp', isPrimary: true, order: 0 }],
  status: 'APPROVED',
  isFeatured: false,
  viewCount: 0,
  favoriteCount: 0,
  unlockCount: 0,
  customContactPhone: '+256700000001',
  customContactName: 'Private contact',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Property;

function keysDeep(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]);
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

describe('public property serializer', () => {
  it('deeply excludes private identity, contact, payment, and exact coordinate keys', () => {
    const serialized = toPublicProperty(property, undefined, {
      id: 'private-landlord-id',
      email: 'private@example.com',
      phone: '+256700000001',
      passwordHash: 'private-hash',
      role: 'LANDLORD',
      fullName: 'Private person',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    const keys = keysDeep(serialized);
    for (const forbidden of [
      'customContactPhone', 'customContactName', 'landlordId', 'email', 'passwordHash',
      'phone', 'latitude', 'longitude', 'providerTransactionId', 'metadata', 'idempotencyKey',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('returns a stable approximate point within 300 metres of the stored point', () => {
    const first = toPublicProperty(property).location.approximateLocation;
    const second = toPublicProperty(property).location.approximateLocation;
    expect(first).toEqual(second);
    expect(first.mode).toBe('APPROX');
    expect(first.radiusMeters).toBe(500);
    expect(distanceMeters(property.location.latitude, property.location.longitude, first.lat, first.lng)).toBeLessThanOrEqual(300.1);
  });
});
