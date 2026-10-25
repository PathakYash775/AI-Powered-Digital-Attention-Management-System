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
    const { token: deviceToken } = await createTestDevice(user.id, 'Chrome Test', 'chrome');

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

  it('valid desktop batch inserts, assigns app category, and handles duplicate clientEventId safely', async () => {
    const { user } = await createTestUser('desktop@example.com', 'Password123!', 'Desktop User');
    const { token: deviceToken } = await createTestDevice(user.id, 'Windows Test', 'windows');

    const now = Date.now();
    const event1 = {
      clientEventId: 'evt-desk-1',
      app: 'code',
      startedAt: new Date(now - 120000).toISOString(),
      endedAt: new Date(now - 60000).toISOString(),
      idle: false,
    };
    const event2 = {
      clientEventId: 'evt-desk-2',
      app: 'spotify',
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

    const logs = await prisma.activityLog.findMany({
      where: { userId: user.id },
    });
    expect(logs).toHaveLength(2);

    const codeLog = logs.find((l) => l.clientEventId === 'evt-desk-1');
    expect(codeLog).toBeDefined();
    expect(codeLog?.source).toBe('desktop');
    expect(codeLog?.appName).toBe('code');
    expect(codeLog?.domain).toBeNull();
    expect(codeLog?.category).toBe('productive');
    expect(codeLog?.durationSec).toBe(60);

    const spotifyLog = logs.find((l) => l.clientEventId === 'evt-desk-2');
    expect(spotifyLog).toBeDefined();
    expect(spotifyLog?.source).toBe('desktop');
    expect(spotifyLog?.appName).toBe('spotify');
    expect(spotifyLog?.domain).toBeNull();
    expect(spotifyLog?.category).toBe('entertainment');

    // Duplicate submission
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

  it('rejects cross-platform payloads: windows device sending browser events, and chrome device sending desktop events', async () => {
    const { user } = await createTestUser('crossplat@example.com', 'Password123!', 'Cross User');
    const { token: winToken } = await createTestDevice(user.id, 'Win Dev', 'windows');
    const { token: chromeToken } = await createTestDevice(user.id, 'Chrome Dev', 'chrome');

    const now = Date.now();
    const browserEvent = {
      clientEventId: 'evt-b-1',
      domain: 'github.com',
      startedAt: new Date(now - 60000).toISOString(),
      endedAt: new Date(now).toISOString(),
      idle: false,
    };
    const desktopEvent = {
      clientEventId: 'evt-d-1',
      app: 'code',
      startedAt: new Date(now - 60000).toISOString(),
      endedAt: new Date(now).toISOString(),
      idle: false,
    };

    // Windows device sends browser event -> 400
    const winRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${winToken}`)
      .send({ events: [browserEvent] });
    expect(winRes.status).toBe(400);
    expect(winRes.body.error.code).toBe('VALIDATION_ERROR');

    // Chrome device sends desktop event -> 400
    const chromeRes = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${chromeToken}`)
      .send({ events: [desktopEvent] });
    expect(chromeRes.status).toBe(400);
    expect(chromeRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates desktop app name format according to regex', async () => {
    const { user } = await createTestUser('appval@example.com', 'Password123!', 'App Val');
    const { token: winToken } = await createTestDevice(user.id, 'Win Dev', 'windows');

    const now = Date.now();
    const makeEvent = (app: string) => ({
      clientEventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
      app,
      startedAt: new Date(now - 60000).toISOString(),
      endedAt: new Date(now).toISOString(),
      idle: false,
    });

    // Invalid app names: uppercase, paths, spaces at start, oversized
    const invalidNames = [
      'Code', // uppercase
      'C:\\app.exe', // windows path
      'apps/mytool', // unix path
      ' ', // single space
      'a'.repeat(65), // > 64 chars
    ];

    for (const badName of invalidNames) {
      const res = await request(app)
        .post('/api/v1/ingest/activity')
        .set('Authorization', `Bearer ${winToken}`)
        .send({ events: [makeEvent(badName)] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('categorizes desktop apps correctly with fallback to other', async () => {
    const { user } = await createTestUser('appcat@example.com', 'Password123!', 'App Cat');
    const { token: winToken } = await createTestDevice(user.id, 'Win Dev', 'windows');

    const now = Date.now();
    const res = await request(app)
      .post('/api/v1/ingest/activity')
      .set('Authorization', `Bearer ${winToken}`)
      .send({
        events: [
          {
            clientEventId: 'evt-slack',
            app: 'slack',
            startedAt: new Date(now - 60000).toISOString(),
            endedAt: new Date(now - 30000).toISOString(),
            idle: false,
          },
          {
            clientEventId: 'evt-unknown-app',
            app: 'randomapp123',
            startedAt: new Date(now - 30000).toISOString(),
            endedAt: new Date(now).toISOString(),
            idle: false,
          },
        ],
      });

    expect(res.status).toBe(200);

    const logs = await prisma.activityLog.findMany({
      where: { userId: user.id },
    });

    const slackLog = logs.find((l) => l.clientEventId === 'evt-slack');
    expect(slackLog?.category).toBe('communication');

    const unknownLog = logs.find((l) => l.clientEventId === 'evt-unknown-app');
    expect(unknownLog?.category).toBe('other');
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
