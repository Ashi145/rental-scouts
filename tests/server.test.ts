import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server.ts';
import { db, hashPassword } from '../src/server/db/database.ts';
import { generateToken } from '../src/server/auth/authService.ts';

process.env.AUTH_SECRET = 'unit-test-auth-secret-0123456789-abcd';
process.env.LOCATION_FUZZ_SECRET = 'unit-test-location-secret-0123456789';

describe('baseline HTTP behavior', () => {
  let app: Express;
  let tenantToken: string;
  let landlordToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const createTestUser = (role: 'TENANT' | 'LANDLORD' | 'ADMIN') => db.createUser({
      email: `test-${role.toLowerCase()}-${crypto.randomUUID()}@example.com`,
      passwordHash: hashPassword(crypto.randomUUID()),
      fullName: `Test ${role}`,
      phone: '+256700000001',
      role,
    });
    const tenant = createTestUser('TENANT');
    const landlord = createTestUser('LANDLORD');
    const admin = createTestUser('ADMIN');
    tenantToken = generateToken(tenant);
    landlordToken = generateToken(landlord);
    adminToken = generateToken(admin);
    app = await createApp({ serveFrontend: false });
  });

  afterAll(() => {
    // createApp does not bind a listener, so no network resources need cleanup.
  });

  it('exposes the API health check without starting a listener', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      app: 'Rental Scout Uganda',
      currency: 'UGX',
    });
  });

  it('does not expose Express branding', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('removes the demo role-switching endpoint', async () => {
    const response = await request(app).post('/api/auth/switch-demo').send({ role: 'ADMIN' });
    expect(response.status).toBe(404);
  });

  it('enforces admin and landlord roles after global auth population', async () => {
    expect((await request(app).get('/api/admin/analytics')).status).toBe(401);
    expect((await request(app).get('/api/admin/analytics').set('Cookie', `rental_scout_token=${tenantToken}`)).status).toBe(403);
    expect((await request(app).get('/api/admin/analytics').set('Cookie', `rental_scout_token=${adminToken}`)).status).toBe(200);

    expect((await request(app).get('/api/landlord/stats')).status).toBe(401);
    expect((await request(app).get('/api/landlord/stats').set('Cookie', `rental_scout_token=${tenantToken}`)).status).toBe(403);
    expect((await request(app).get('/api/landlord/stats').set('Cookie', `rental_scout_token=${landlordToken}`)).status).toBe(200);
  });

  it('rejects bearer tokens and revokes opaque sessions on logout', async () => {
    expect((await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${adminToken}`)).status).toBe(401);
    const logout = await request(app).post('/api/auth/logout').set('Cookie', `rental_scout_token=${adminToken}`);
    expect(logout.status).toBe(200);
    expect((await request(app).get('/api/admin/analytics').set('Cookie', `rental_scout_token=${adminToken}`)).status).toBe(401);
  });

  it('removes client-authoritative payment verification and ignores forged callbacks', async () => {
    const unlockCount = db.getAllContactUnlocks().length;
    expect((await request(app).post('/api/payments/transaction-id/verify')).status).toBe(404);
    const callback = await request(app)
      .post('/api/payments/webhook/MTN_MOMO')
      .set('x-provider', 'SANDBOX')
      .send({ internalReference: 'transaction-id', status: 'SUCCESS' });
    expect(callback.status).toBe(202);
    expect(db.getAllContactUnlocks()).toHaveLength(unlockCount);
  });

  it('rejects client selection of the sandbox provider', async () => {
    const response = await request(app)
      .post('/api/payments/initiate')
      .set('Cookie', `rental_scout_token=${tenantToken}`)
      .send({ propertyId: 'irrelevant', phoneNumber: '+256700000001', paymentMethod: 'SANDBOX' });
    expect(response.status).toBe(400);
  });
});
