import { describe, it, expect, beforeEach } from 'vitest';
import {
  app,
  request,
  resetDatabase,
  createTestUser,
  getAuthToken,
  createTestDevice,
} from './helpers.js';
import { prisma } from '../lib/prisma.js';
import { generatePairingCode, hashToken } from '../lib/security.js';

describe('Devices Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('pairing code is single use (atomic consumption)', async () => {
    const { user } = await createTestUser('devuser@example.com', 'Password123!', 'Dev User');
    const token = await getAuthToken(user.id);

    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${token}`);

    expect(codeRes.status).toBe(200);
    const { code } = codeRes.body;
    expect(code).toBeDefined();

    // Pair the device
    const pairRes1 = await request(app)
      .post('/api/v1/devices/pair')
      .send({ code, deviceName: 'Work Laptop' });

    expect(pairRes1.status).toBe(200);
    expect(pairRes1.body).toHaveProperty('deviceId');
    expect(pairRes1.body).toHaveProperty('deviceToken');
    expect(pairRes1.body.deviceToken.startsWith('atn_')).toBe(true);

    // Second pairing attempt with same code fails with 400
    const pairRes2 = await request(app)
      .post('/api/v1/devices/pair')
      .send({ code, deviceName: 'Work Laptop 2' });

    expect(pairRes2.status).toBe(400);
    expect(pairRes2.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('expired pairing code fails with generic 400 error', async () => {
    const { user } = await createTestUser('expdev@example.com', 'Password123!', 'Exp User');
    const code = generatePairingCode();
    const codeHash = hashToken(code);

    // Insert expired code directly
    await prisma.pairingCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
      },
    });

    const pairRes = await request(app)
      .post('/api/v1/devices/pair')
      .send({ code, deviceName: 'Old Phone' });

    expect(pairRes.status).toBe(400);
    expect(pairRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(pairRes.body.error.message).toBe('Invalid or expired pairing code');
  });

  it('invalid code format or unknown code returns same generic 400 error', async () => {
    const res = await request(app)
      .post('/api/v1/devices/pair')
      .send({ code: 'INVALID8', deviceName: 'Unknown Device' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('revoked device is rejected on ingest with 401', async () => {
    const { user } = await createTestUser('revdev@example.com', 'Password123!', 'Rev User');
    const { device, token: deviceToken } = await createTestDevice(user.id, 'Revoked Chrome');

    // Revoke the device
    await prisma.device.update({
      where: { id: device.id },
      data: { revokedAt: new Date() },
    });

    const ingestRes = await request(app)
      .post('/api/v1/ingest/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`);

    expect(ingestRes.status).toBe(401);
    expect(ingestRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it("user cannot revoke another user's device (404 NOT_FOUND)", async () => {
    const { user: userA } = await createTestUser('usera2@example.com', 'Password123!', 'User A2');
    const { user: userB } = await createTestUser('userb2@example.com', 'Password123!', 'User B2');

    const tokenB = await getAuthToken(userB.id);
    const { device: deviceA } = await createTestDevice(userA.id, "User A's Device");

    const revokeRes = await request(app)
      .delete(`/api/v1/devices/${deviceA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(revokeRes.status).toBe(404);
    expect(revokeRes.body.error.code).toBe('NOT_FOUND');
  });

  it('device token is never returned by GET /devices', async () => {
    const { user } = await createTestUser('secdev@example.com', 'Password123!', 'Sec Dev User');
    const token = await getAuthToken(user.id);
    await createTestDevice(user.id, 'Chrome Desktop');

    const res = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);

    const dev = res.body[0];
    expect(dev).toHaveProperty('id');
    expect(dev).toHaveProperty('name');
    expect(dev).toHaveProperty('platform');
    expect(dev).toHaveProperty('lastSeenAt');
    expect(dev).toHaveProperty('revokedAt');
    expect(dev).not.toHaveProperty('tokenHash');
    expect(dev).not.toHaveProperty('token');
  });
});
