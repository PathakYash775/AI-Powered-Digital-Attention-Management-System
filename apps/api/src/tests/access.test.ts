import { describe, it, expect, beforeEach } from 'vitest';
import {
  app,
  request,
  resetDatabase,
  createTestUser,
  createTestDevice,
  getAuthToken,
} from './helpers.js';
import { prisma } from '../lib/prisma.js';

describe('Access and Authorization Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("user B cannot read, edit or delete user A's goal (returns 404, never 403)", async () => {
    const { user: userA } = await createTestUser('usera@example.com', 'Password123!', 'User A');
    const { user: userB } = await createTestUser('userb@example.com', 'Password123!', 'User B');

    const tokenA = await getAuthToken(userA.id);
    const tokenB = await getAuthToken(userB.id);

    // User A creates a goal
    const createRes = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'focus_minutes',
        period: 'daily',
        targetValue: 60,
      });

    expect(createRes.status).toBe(201);
    const goalId = createRes.body.id;

    // User B tries to patch user A's goal -> 404
    const patchRes = await request(app)
      .patch(`/api/v1/goals/${goalId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        targetValue: 120,
      });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error.code).toBe('NOT_FOUND');

    // User B tries to delete user A's goal -> 404
    const deleteRes = await request(app)
      .delete(`/api/v1/goals/${goalId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body.error.code).toBe('NOT_FOUND');
  });

  it('goal limits: bounds validation and max 20 per user (409 CONFLICT)', async () => {
    const { user } = await createTestUser('limits@example.com', 'Password123!', 'Limits User');
    const token = await getAuthToken(user.id);

    // Invalid targetValue bounds (< 1 or > 10080)
    const tooLowRes = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'focus_minutes',
        period: 'daily',
        targetValue: 0,
      });
    expect(tooLowRes.status).toBe(400);

    const tooHighRes = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'focus_minutes',
        period: 'daily',
        targetValue: 10081,
      });
    expect(tooHighRes.status).toBe(400);

    // Create 20 goals
    for (let i = 1; i <= 20; i++) {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'focus_minutes',
          period: 'daily',
          targetValue: i * 10,
        });
      expect(res.status).toBe(201);
    }

    // 21st goal returns 409 CONFLICT
    const extraRes = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'max_screen_minutes',
        period: 'daily',
        targetValue: 300,
      });

    expect(extraRes.status).toBe(409);
    expect(extraRes.body.error.code).toBe('CONFLICT');
  });

  it('focus session start returns 409 when one is already active', async () => {
    const { user } = await createTestUser('focus@example.com', 'Password123!', 'Focus User');
    const token = await getAuthToken(user.id);

    const first = await request(app)
      .post('/api/v1/focus-sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ plannedMin: 30 });

    expect(first.status).toBe(201);
    expect(first.body.status).toBe('active');

    // Second active attempt -> 409
    const second = await request(app)
      .post('/api/v1/focus-sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ plannedMin: 45 });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('interruptionCount is correctly calculated from context switches and notifications', async () => {
    const { user } = await createTestUser('interrupt@example.com', 'Password123!', 'Interrupt User');
    const token = await getAuthToken(user.id);

    const sessionRes = await request(app)
      .post('/api/v1/focus-sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ plannedMin: 60 });

    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.id;

    // Set startedAt to 10 seconds ago so duringTime is within [startedAt, endedAt]
    const tenSecAgo = new Date(Date.now() - 10000);
    await prisma.focusSession.update({
      where: { id: sessionId },
      data: { startedAt: tenSecAgo },
    });

    const { device } = await createTestDevice(user.id);
    const duringTime = new Date(Date.now() - 5000);
    await prisma.contextSwitch.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'evt-sw-1',
        fromApp: 'VS Code',
        toApp: 'Slack',
        switchedAt: duringTime,
      },
    });

    await prisma.notificationEvent.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'evt-notif-1',
        sourceApp: 'Slack',
        receivedAt: duringTime,
      },
    });

    // Stop the session
    const stopRes = await request(app)
      .post(`/api/v1/focus-sessions/${sessionId}/stop`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.interruptionCount).toBe(2);
    expect(stopRes.body.status).toBe('completed');
    expect(stopRes.body.endedAt).toBeDefined();
  });

  it('extra body fields are rejected (mass assignment protection via zod .strict())', async () => {
    const { user } = await createTestUser('strict@example.com', 'Password123!', 'Strict User');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'focus_minutes',
        period: 'daily',
        targetValue: 60,
        extraMaliciousField: 'exploit',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
