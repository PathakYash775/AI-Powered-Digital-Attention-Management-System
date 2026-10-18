import { describe, it, expect, beforeEach } from 'vitest';
import {
  app,
  request,
  resetDatabase,
  createTestUser,
  createTestDevice,
} from './helpers.js';
import { prisma } from '../lib/prisma.js';

describe('Ingest Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('valid batch inserts and handles duplicate clientEventId safely', async () => {
    const { user } = await createTestUser('ingest@example.com', 'Password123!', 'Ingest User');
    const { token: deviceToken } = await createTestDevice(user.id, 'Chrome Test');

    const now = Date.now();
    const event1 = {
      clientEventId: 'evt-act-1',
      domain: 'github.com',
      startedAt: new Date(now - 120000).toISOString(),
      endedAt: new Date(now - 60000).toISOString(),
      idle: false,
    };
    const event2 = {
      clientEventId: 'evt-act-2',
      domain: 'youtube.com',
      startedAt: new Date(now - 60000).toISOString(),
      endedAt: new Date(now).toISOString(),
      idle: true,
    };

    const firstRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ events: [event1, event2] });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body).toEqual({
      received: 2,
      inserted: 2,
      duplicates: 0,
    });

    // Send the SAME batch again -> inserted 0, duplicates 2
    const secondRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ events: [event1, event2] });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body).toEqual({
      received: 2,
      inserted: 0,
      duplicates: 2,
    });
  });

  it('rejects oversized batch, future timestamp, and end before start', async () => {
    const { user } = await createTestUser('invalid@example.com', 'Password123!', 'Invalid User');
    const { token: deviceToken } = await createTestDevice(user.id, 'Chrome Test');

    const now = Date.now();

    // End before start
    const endBeforeStartRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        events: [
          {
            clientEventId: 'evt-bad-time',
            domain: 'github.com',
            startedAt: new Date(now).toISOString(),
            endedAt: new Date(now - 10000).toISOString(),
            idle: false,
          },
        ],
      });
    expect(endBeforeStartRes.status).toBe(400);
    expect(endBeforeStartRes.body.error.code).toBe('VALIDATION_ERROR');

    // Future timestamp (> 5 min future)
    const futureTimeRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        events: [
          {
            clientEventId: 'evt-future',
            domain: 'github.com',
            startedAt: new Date(now + 10 * 60 * 1000).toISOString(),
            endedAt: new Date(now + 12 * 60 * 1000).toISOString(),
            idle: false,
          },
        ],
      });
    expect(futureTimeRes.status).toBe(400);

    // Oversized batch (> 500)
    const bigBatch = Array.from({ length: 501 }, (_, i) => ({
      clientEventId: `evt-big-${i}`,
      domain: 'github.com',
      startedAt: new Date(now - 2000).toISOString(),
      endedAt: new Date(now - 1000).toISOString(),
      idle: false,
    }));
    const oversizedRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ events: bigBatch });
    expect(oversizedRes.status).toBe(400);
  });

  it('category is assigned by longest-suffix match and durationSec is computed server-side', async () => {
    const { user } = await createTestUser('match@example.com', 'Password123!', 'Match User');
    const { token: deviceToken } = await createTestDevice(user.id, 'Chrome Test');

    const now = Date.now();
    const startedAt = new Date(now - 30000);
    const endedAt = new Date(now);

    // sub.youtube.com matches youtube.com (entertainment)
    // web.whatsapp.com matches web.whatsapp.com (communication)
    // unknown.org defaults to other
    const res = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        events: [
          {
            clientEventId: 'evt-match-yt',
            domain: 'm.youtube.com',
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            idle: false,
          },
          {
            clientEventId: 'evt-match-wa',
            domain: 'web.whatsapp.com',
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            idle: false,
          },
          {
            clientEventId: 'evt-match-other',
            domain: 'random-unknown-site.org',
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            idle: false,
          },
        ],
      });

    expect(res.status).toBe(200);

    const logs = await prisma.activityLog.findMany({
      where: { userId: user.id },
    });

    const ytLog = logs.find((l) => l.clientEventId === 'evt-match-yt');
    const waLog = logs.find((l) => l.clientEventId === 'evt-match-wa');
    const otherLog = logs.find((l) => l.clientEventId === 'evt-match-other');

    expect(ytLog).toBeDefined();
    expect(ytLog?.category).toBe('entertainment');
    expect(ytLog?.durationSec).toBe(30);

    expect(waLog).toBeDefined();
    expect(waLog?.category).toBe('communication');
    expect(waLog?.durationSec).toBe(30);

    expect(otherLog).toBeDefined();
    expect(otherLog?.category).toBe('other');
    expect(otherLog?.durationSec).toBe(30);
  });
});
