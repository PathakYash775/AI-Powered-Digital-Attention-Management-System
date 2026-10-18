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
import { recomputeUsageForDates } from '../modules/usage/rollup.js';

describe('Usage and Rollup Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('summary math: totalScreenSec = activeSec + idleSec, topSites sorted top 5 non-idle', async () => {
    const { user } = await createTestUser('usage1@example.com', 'Password123!', 'Usage 1');
    const { device } = await createTestDevice(user.id);
    const token = await getAuthToken(user.id);
    const dateStr = '2026-10-10';

    const start1 = new Date('2026-10-10T10:00:00.000Z');
    const end1 = new Date('2026-10-10T10:01:40.000Z'); // 100s

    const start2 = new Date('2026-10-10T11:00:00.000Z');
    const end2 = new Date('2026-10-10T11:00:50.000Z'); // 50s

    const start3 = new Date('2026-10-10T12:00:00.000Z');
    const end3 = new Date('2026-10-10T12:00:30.000Z'); // 30s idle

    await prisma.activityLog.createMany({
      data: [
        {
          userId: user.id,
          deviceId: device.id,
          clientEventId: 'act-1',
          domain: 'github.com',
          category: 'productive',
          startedAt: start1,
          endedAt: end1,
          durationSec: 100,
          idle: false,
        },
        {
          userId: user.id,
          deviceId: device.id,
          clientEventId: 'act-2',
          domain: 'stackoverflow.com',
          category: 'productive',
          startedAt: start2,
          endedAt: end2,
          durationSec: 50,
          idle: false,
        },
        {
          userId: user.id,
          deviceId: device.id,
          clientEventId: 'act-3',
          domain: 'youtube.com',
          category: 'entertainment',
          startedAt: start3,
          endedAt: end3,
          durationSec: 30,
          idle: true,
        },
      ],
    });

    await prisma.contextSwitch.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'sw-1',
        fromApp: 'VS Code',
        toApp: 'Google Chrome',
        switchedAt: new Date('2026-10-10T10:15:00.000Z'),
      },
    });

    await prisma.notificationEvent.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'notif-1',
        sourceApp: 'Slack',
        receivedAt: new Date('2026-10-10T10:20:00.000Z'),
      },
    });

    await recomputeUsageForDates(user.id, [dateStr]);

    const res = await request(app)
      .get(`/api/v1/activity/summary?date=${dateStr}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(dateStr);
    expect(res.body.activeSec).toBe(150);
    expect(res.body.idleSec).toBe(30);
    expect(res.body.totalScreenSec).toBe(180);
    expect(res.body.switchCount).toBe(1);
    expect(res.body.notificationCount).toBe(1);

    expect(res.body.topSites).toEqual([
      { name: 'github.com', durationSec: 100 },
      { name: 'stackoverflow.com', durationSec: 50 },
    ]);

    expect(res.body.hourly).toHaveLength(24);
    expect(res.body.hourly[10].activeSec).toBe(100);
    expect(res.body.hourly[10].switchCount).toBe(1);
    expect(res.body.hourly[11].activeSec).toBe(50);
    expect(res.body.hourly[12].idleSec).toBe(30);
  });

  it('hourly split of a segment crossing an hour boundary and midnight', async () => {
    const { user } = await createTestUser('cross@example.com', 'Password123!', 'Cross User');
    const { device } = await createTestDevice(user.id);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'cross-act-1',
        domain: 'github.com',
        category: 'productive',
        startedAt: new Date('2026-10-10T23:45:00.000Z'),
        endedAt: new Date('2026-10-11T01:15:00.000Z'),
        durationSec: 5400,
        idle: false,
      },
    });

    await recomputeUsageForDates(user.id, ['2026-10-10', '2026-10-11']);

    const patternDay1 = await prisma.hourlyUsagePattern.findUnique({
      where: {
        userId_date_hour: {
          userId: user.id,
          date: '2026-10-10',
          hour: 23,
        },
      },
    });

    const patternDay2H0 = await prisma.hourlyUsagePattern.findUnique({
      where: {
        userId_date_hour: {
          userId: user.id,
          date: '2026-10-11',
          hour: 0,
        },
      },
    });

    const patternDay2H1 = await prisma.hourlyUsagePattern.findUnique({
      where: {
        userId_date_hour: {
          userId: user.id,
          date: '2026-10-11',
          hour: 1,
        },
      },
    });

    expect(patternDay1?.activeSec).toBe(900);
    expect(patternDay2H0?.activeSec).toBe(3600);
    expect(patternDay2H1?.activeSec).toBe(900);
  });

  it('handles Asia/Kolkata (+05:30) timezone correctly', async () => {
    const { user } = await createTestUser('kolkata@example.com', 'Password123!', 'Kolkata User');
    const { device } = await createTestDevice(user.id);
    await prisma.profile.update({
      where: { userId: user.id },
      data: { timezone: 'Asia/Kolkata' },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'kolkata-1',
        domain: 'github.com',
        category: 'productive',
        startedAt: new Date('2026-10-10T14:00:00.000Z'),
        endedAt: new Date('2026-10-10T14:45:00.000Z'),
        durationSec: 2700,
        idle: false,
      },
    });

    await recomputeUsageForDates(user.id, ['2026-10-10']);

    const h19 = await prisma.hourlyUsagePattern.findUnique({
      where: {
        userId_date_hour: {
          userId: user.id,
          date: '2026-10-10',
          hour: 19,
        },
      },
    });

    const h20 = await prisma.hourlyUsagePattern.findUnique({
      where: {
        userId_date_hour: {
          userId: user.id,
          date: '2026-10-10',
          hour: 20,
        },
      },
    });

    expect(h19?.activeSec).toBe(1800);
    expect(h20?.activeSec).toBe(900);
  });

  it('handles America/New_York (DST day) correctly', async () => {
    const { user } = await createTestUser('ny@example.com', 'Password123!', 'NY User');
    const { device } = await createTestDevice(user.id);
    await prisma.profile.update({
      where: { userId: user.id },
      data: { timezone: 'America/New_York' },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'dst-1',
        domain: 'github.com',
        category: 'productive',
        startedAt: new Date('2026-11-01T15:00:00.000Z'),
        endedAt: new Date('2026-11-01T16:00:00.000Z'),
        durationSec: 3600,
        idle: false,
      },
    });

    await recomputeUsageForDates(user.id, ['2026-11-01']);

    const stat = await prisma.dailyUsageStat.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: '2026-11-01',
        },
      },
    });

    expect(stat?.activeSec).toBe(3600);
    expect(stat?.totalScreenSec).toBe(3600);
  });

  it('rollup is completely idempotent when recomputed multiple times', async () => {
    const { user } = await createTestUser('idem@example.com', 'Password123!', 'Idem User');
    const { device } = await createTestDevice(user.id);
    const dateStr = '2026-10-12';

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        clientEventId: 'idem-1',
        domain: 'github.com',
        category: 'productive',
        startedAt: new Date('2026-10-12T10:00:00.000Z'),
        endedAt: new Date('2026-10-12T10:30:00.000Z'),
        durationSec: 1800,
        idle: false,
      },
    });

    await recomputeUsageForDates(user.id, [dateStr]);
    const firstResult = await prisma.dailyUsageStat.findUnique({
      where: { userId_date: { userId: user.id, date: dateStr } },
    });

    await recomputeUsageForDates(user.id, [dateStr]);
    const secondResult = await prisma.dailyUsageStat.findUnique({
      where: { userId_date: { userId: user.id, date: dateStr } },
    });

    expect(firstResult).toEqual(secondResult);
    expect(firstResult?.activeSec).toBe(1800);
    expect(firstResult?.totalScreenSec).toBe(1800);
  });
});
