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

describe('Analytics Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('GET /api/v1/analytics/daily returns daily metrics and attention score', async () => {
    const { user } = await createTestUser('analytics1@example.com', 'Password123!', 'Analytics User 1');
    const { device } = await createTestDevice(user.id);
    const token = await getAuthToken(user.id);
    const dateStr = '2026-10-20';

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'act-a1',
        domain: 'github.com',
        category: 'productive',
        startedAt: new Date(`${dateStr}T09:00:00.000Z`),
        endedAt: new Date(`${dateStr}T10:00:00.000Z`),
        durationSec: 3600,
        idle: false,
      },
    });

    const { recomputeUsageForDates } = await import('../modules/usage/rollup.js');
    await recomputeUsageForDates(user.id, [dateStr]);

    const res = await request(app)
      .get(`/api/v1/analytics/daily?date=${dateStr}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('attentionScore');
    expect(res.body.date).toBe(dateStr);
    expect(res.body.focusedMinutes).toBe(60);
    expect(res.body.attentionScore).toBeGreaterThanOrEqual(70);
  });

  it('GET /api/v1/analytics/focus-score returns calculated rating and recommendations', async () => {
    const { user } = await createTestUser('analytics2@example.com', 'Password123!', 'Analytics User 2');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .get('/api/v1/analytics/focus-score')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('focusScore');
    expect(res.body).toHaveProperty('rating');
    expect(res.body).toHaveProperty('recommendation');
  });

  it('GET /api/v1/analytics/distractions returns distraction sources and rates', async () => {
    const { user } = await createTestUser('analytics3@example.com', 'Password123!', 'Analytics User 3');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .get('/api/v1/analytics/distractions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('distractionCount');
    expect(res.body).toHaveProperty('distractedMinutes');
    expect(res.body).toHaveProperty('riskLevel');
  });

  it('GET /api/v1/analytics/predictions returns ML prediction payload with features', async () => {
    const { user } = await createTestUser('analytics4@example.com', 'Password123!', 'Analytics User 4');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .get('/api/v1/analytics/predictions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('prediction');
    expect(res.body.prediction).toHaveProperty('attentionScore');
    expect(res.body.prediction).toHaveProperty('isDistracted');
    expect(res.body).toHaveProperty('featuresUsed');
  });

  it('GET /api/v1/analytics/insights and /summary return structured cognitive reporting', async () => {
    const { user } = await createTestUser('analytics5@example.com', 'Password123!', 'Analytics User 5');
    const token = await getAuthToken(user.id);

    const insRes = await request(app)
      .get('/api/v1/analytics/insights')
      .set('Authorization', `Bearer ${token}`);
    expect(insRes.status).toBe(200);
    expect(Array.isArray(insRes.body.insights)).toBe(true);

    const sumRes = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(sumRes.status).toBe(200);
    expect(sumRes.body).toHaveProperty('summaryStatement');
  });

  it('POST /api/v1/analytics/simulate returns prediction for custom parameters', async () => {
    const { user } = await createTestUser('analytics6@example.com', 'Password123!', 'Analytics User 6');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .post('/api/v1/analytics/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        appName: 'Visual Studio Code',
        category: 'productive',
        hoursUsed: 2.5,
        dayUsed: 'Thursday',
        numberEvents: 100,
        numberInteractions: 2000,
        switches: 4,
        eventSpan: 150,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('prediction');
    expect(res.body.prediction).toHaveProperty('attentionScore');
    expect(res.body.prediction).toHaveProperty('isDistracted');
    expect(res.body.prediction).toHaveProperty('modelEngine');
  });

  it('GET /api/v1/analytics/weekly-summary returns weekly breakdown and today metrics', async () => {
    const { user } = await createTestUser('analytics7@example.com', 'Password123!', 'Analytics User 7');
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .get('/api/v1/analytics/weekly-summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('today');
    expect(res.body).toHaveProperty('days');
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.days.length).toBe(7);
    expect(res.body.today).toHaveProperty('completedFocusSessions');
    expect(res.body.today).toHaveProperty('status');
  });
});
