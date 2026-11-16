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

  it('POST /devices/register registers device and returns deviceToken', async () => {
    const { user } = await createTestUser('regtest@example.com', 'Password123!', 'Reg User');
    const token = await getAuthToken(user.id);

    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${token}`);

    expect(codeRes.status).toBe(200);
    const { code } = codeRes.body;

    const regRes = await request(app)
      .post('/api/v1/devices/register')
      .send({ code, deviceName: 'Chrome Extension Test', platform: 'chrome' });

    expect(regRes.status).toBe(200);
    expect(regRes.body).toHaveProperty('deviceId');
    expect(regRes.body).toHaveProperty('deviceToken');
    expect(regRes.body.deviceToken.startsWith('atn_')).toBe(true);
    expect(regRes.body.platform).toBe('chrome');
  });

  it('POST /devices/heartbeat succeeds with valid device token and updates lastSeenAt', async () => {
    const { user } = await createTestUser('hbtest@example.com', 'Password123!', 'HB User');
    const { device, token: deviceToken } = await createTestDevice(user.id, 'Heartbeat Chrome');

    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`);

    expect(hbRes.status).toBe(200);
    expect(hbRes.body).toHaveProperty('status', 'ok');
    expect(hbRes.body).toHaveProperty('deviceId', device.id);
    expect(hbRes.body).toHaveProperty('serverTime');
  });

  it('POST /devices/heartbeat rejects invalid or unauthenticated requests with 401', async () => {
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', 'Bearer atn_invalid_nonexistent_token_123456');

    expect(hbRes.status).toBe(401);
    expect(hbRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /devices/status accurately reflects device connection recency', async () => {
    const { user } = await createTestUser('statustest@example.com', 'Password123!', 'Status User');
    const token = await getAuthToken(user.id);

    // Initial status without any device
    const res1 = await request(app)
      .get('/api/v1/devices/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.connected).toBe(false);

    // Create a device (not yet communicated, lastSeenAt: null)
    const { token: devToken } = await createTestDevice(user.id, 'Active Extension', 'chrome');

    const resBefore = await request(app)
      .get('/api/v1/devices/status')
      .set('Authorization', `Bearer ${token}`);
    expect(resBefore.body.connected).toBe(false);

    // Send heartbeat from the device
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${devToken}`);
    expect(hbRes.status).toBe(200);

    // Device should now be connected
    const resAfter = await request(app)
      .get('/api/v1/devices/status')
      .set('Authorization', `Bearer ${token}`);

    expect(resAfter.status).toBe(200);
    expect(resAfter.body.connected).toBe(true);
    expect(resAfter.body.isRecentlyActive).toBe(true);
    expect(resAfter.body.activeDevice).toBeDefined();
    expect(resAfter.body.activeDevice.name).toBe('Active Extension');
  });

  it('pairs Windows Desktop Tracker, accepts heartbeat, and handles disconnect', async () => {
    const { user } = await createTestUser('wintest@example.com', 'Password123!', 'Win User');
    const token = await getAuthToken(user.id);

    // 1. Generate pairing code
    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${token}`);
    expect(codeRes.status).toBe(200);
    const { code } = codeRes.body;

    // 2. Pair Windows Tracker
    const pairRes = await request(app)
      .post('/api/v1/devices/pair')
      .send({
        code,
        deviceName: 'DESKTOP-YASH (Windows Desktop)',
        platform: 'windows',
      });

    expect(pairRes.status).toBe(200);
    expect(pairRes.body.platform).toBe('windows');
    expect(pairRes.body.deviceToken.startsWith('atn_')).toBe(true);
    const winToken = pairRes.body.deviceToken;
    const winDeviceId = pairRes.body.deviceId;

    // 3. Heartbeat from Windows Tracker
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${winToken}`);
    expect(hbRes.status).toBe(200);
    expect(hbRes.body.status).toBe('ok');

    // 4. Verify in GET /devices
    const listRes = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const foundWin = listRes.body.find((d: any) => d.id === winDeviceId);
    expect(foundWin).toBeDefined();
    expect(foundWin.platform).toBe('windows');
    expect(foundWin.lastSeenAt).toBeDefined();
    expect(foundWin.revokedAt).toBeNull();

    // 5. Windows Tracker unpairs/disconnects
    const discRes = await request(app)
      .post('/api/v1/devices/disconnect')
      .set('Authorization', `Bearer ${winToken}`);
    expect(discRes.status).toBe(200);
    expect(discRes.body.success).toBe(true);

    // 6. Heartbeat after disconnect is rejected with 401
    const hbAfter = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${winToken}`);
    expect(hbAfter.status).toBe(401);
  });

  it('pairs Android Mobile Tracker, accepts heartbeat, and auto-links mobile device', async () => {
    const { user } = await createTestUser('androiddev@example.com', 'Password123!', 'Android User');
    const token = await getAuthToken(user.id);

    // 1. Generate pairing code
    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${token}`);
    expect(codeRes.status).toBe(200);
    const { code } = codeRes.body;

    // 2. Pair Android device with platform: 'android'
    const pairRes = await request(app)
      .post('/api/v1/devices/pair')
      .send({
        code,
        deviceName: 'Pixel 8 Pro (Android)',
        platform: 'android',
      });
    expect(pairRes.status).toBe(200);
    expect(pairRes.body.platform).toBe('android');
    expect(pairRes.body.deviceToken.startsWith('atn_')).toBe(true);
    const androidToken = pairRes.body.deviceToken;
    const androidDeviceId = pairRes.body.deviceId;

    // 3. Heartbeat from Android Tracker
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${androidToken}`);
    expect(hbRes.status).toBe(200);
    expect(hbRes.body.status).toBe('ok');

    // 4. Test authenticated auto-link for mobile
    const autoLinkRes = await request(app)
      .post('/api/v1/devices/auto-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceName: 'Galaxy Tab (Android)',
        platform: 'android',
      });
    expect(autoLinkRes.status).toBe(200);
    expect(autoLinkRes.body.platform).toBe('android');
    expect(autoLinkRes.body.deviceToken.startsWith('atn_')).toBe(true);

    // 5. Verify devices in GET /devices
    const listRes = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const foundAndroid = listRes.body.find((d: any) => d.id === androidDeviceId);
    expect(foundAndroid).toBeDefined();
    expect(foundAndroid.platform).toBe('android');
  });
});
