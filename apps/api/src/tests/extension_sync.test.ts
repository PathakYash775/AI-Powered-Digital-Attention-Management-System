import { describe, it, expect, beforeEach } from 'vitest';
import {
  app,
  request,
  resetDatabase,
  createTestUser,
  getAuthToken,
} from './helpers.js';

describe('Chrome Extension End-to-End Pairing and Activity Synchronization', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('completes the full extension lifecycle: pairing, heartbeat, activity sync, deduplication, and revocation', async () => {
    // 1. User logs into dashboard and generates an 8-character pairing code
    const { user } = await createTestUser('extuser@example.com', 'Password123!', 'Extension User');
    const userJwt = await getAuthToken(user.id);

    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${userJwt}`);

    expect(codeRes.status).toBe(200);
    const { code } = codeRes.body;
    expect(code).toBeDefined();
    expect(code.length).toBe(8);

    // 2. Extension sends pairing request with the 8-character code
    const pairRes = await request(app)
      .post('/api/v1/devices/pair')
      .send({
        code,
        deviceName: 'Chrome Extension (Windows)',
        platform: 'chrome',
      });

    expect(pairRes.status).toBe(200);
    expect(pairRes.body).toHaveProperty('deviceId');
    expect(pairRes.body).toHaveProperty('deviceToken');
    expect(pairRes.body.deviceToken.startsWith('atn_')).toBe(true);
    expect(pairRes.body.platform).toBe('chrome');

    const { deviceId, deviceToken } = pairRes.body;

    // 3. Extension sends authenticated heartbeat
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`);

    expect(hbRes.status).toBe(200);
    expect(hbRes.body.status).toBe('ok');
    expect(hbRes.body.deviceId).toBe(deviceId);

    // 4. Extension sends browser activity telemetry
    const now = Date.now();
    const event1 = {
      clientEventId: 'ext_evt_1_' + now,
      source: 'browser',
      domain: 'github.com',
      startedAt: new Date(now - 120000).toISOString(),
      endedAt: new Date(now - 60000).toISOString(),
      idle: false,
    };

    const syncRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ events: [event1] });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.inserted).toBe(1);
    expect(syncRes.body.duplicates).toBe(0);

    // 5. Duplicate submission prevention (e.g. offline queue retry)
    const retryRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ events: [event1] });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.inserted).toBe(0);
    expect(retryRes.body.duplicates).toBe(1);

    // 6. Web dashboard status reflects connected extension and synced events
    const statusRes = await request(app)
      .get('/api/v1/devices/status')
      .set('Authorization', `Bearer ${userJwt}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.connected).toBe(true);
    expect(statusRes.body.isRecentlyActive).toBe(true);
    expect(statusRes.body.activeDevice.id).toBe(deviceId);
    expect(statusRes.body.todayStats.activityCount).toBe(1);
    expect(statusRes.body.todayStats.lastDomain).toBe('github.com');

    // 7. Disconnect / Revoke extension from the extension
    const discoRes = await request(app)
      .post('/api/v1/devices/disconnect')
      .set('Authorization', `Bearer ${deviceToken}`);

    expect(discoRes.status).toBe(200);
    expect(discoRes.body.success).toBe(true);

    // 8. Subsequent heartbeat or activity sync with revoked token returns 401
    const postRevokeHb = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`);

    expect(postRevokeHb.status).toBe(401);
    expect(postRevokeHb.body.error.code).toBe('UNAUTHENTICATED');

    const postRevokeSync = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        events: [
          {
            clientEventId: 'ext_evt_2_' + now,
            source: 'browser',
            domain: 'stackoverflow.com',
            startedAt: new Date(now - 60000).toISOString(),
            endedAt: new Date(now).toISOString(),
            idle: false,
          },
        ],
      });

    expect(postRevokeSync.status).toBe(401);
  });

  it('enforces cross-user isolation: User A cannot access User B device or status', async () => {
    const { user: userA } = await createTestUser('usera_ext@example.com', 'Password123!', 'User A');
    const { user: userB } = await createTestUser('userb_ext@example.com', 'Password123!', 'User B');

    const tokenA = await getAuthToken(userA.id);
    const tokenB = await getAuthToken(userB.id);

    // User A generates code and pairs extension
    const codeRes = await request(app)
      .post('/api/v1/devices/pairing-code')
      .set('Authorization', `Bearer ${tokenA}`);
    const { code } = codeRes.body;

    const pairRes = await request(app)
      .post('/api/v1/devices/pair')
      .send({ code, deviceName: 'User A Chrome', platform: 'chrome' });

    const { deviceId, deviceToken } = pairRes.body;

    // User B tries to delete User A's device -> 404
    const delRes = await request(app)
      .delete(`/api/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(delRes.status).toBe(404);

    // User B's device list does not contain User A's device
    const listB = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listB.body.some((d: { id: string }) => d.id === deviceId)).toBe(false);

    // Heartbeat from device A attributes to User A
    const hbRes = await request(app)
      .post('/api/v1/devices/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`);
    expect(hbRes.status).toBe(200);

    // User B status shows not connected
    const statusB = await request(app)
      .get('/api/v1/devices/status')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(statusB.body.connected).toBe(false);
  });
});

