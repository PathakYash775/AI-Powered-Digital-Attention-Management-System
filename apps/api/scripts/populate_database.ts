import { PrismaClient, Category, FocusSessionStatus, GoalType, GoalPeriod } from '@prisma/client';
import crypto from 'node:crypto';
import { recomputeUsageForDates } from '../src/modules/usage/rollup.js';
import { seedDomainCategories } from '../prisma/seed.js';

const prisma = new PrismaClient();

interface RawActivity {
  domain: string;
  category: Category;
  startHour: number;
  startMin: number;
  durationMin: number;
}

const DAILY_SCHEDULES: Record<string, RawActivity[]> = {
  '2026-10-21': [
    { domain: 'github.com', category: Category.productive, startHour: 8, startMin: 30, durationMin: 45 },
    { domain: 'claude.ai', category: Category.productive, startHour: 9, startMin: 15, durationMin: 60 },
    { domain: 'takeuforward.org', category: Category.productive, startHour: 10, startMin: 15, durationMin: 40 },
    { domain: 'chatgpt.com', category: Category.productive, startHour: 10, startMin: 55, durationMin: 45 },
    { domain: 'slack.com', category: Category.communication, startHour: 11, startMin: 40, durationMin: 30 },
    { domain: 'youtube.com', category: Category.entertainment, startHour: 12, startMin: 10, durationMin: 30 },
    { domain: 'localhost', category: Category.productive, startHour: 13, startMin: 30, durationMin: 60 },
    { domain: 'stackoverflow.com', category: Category.productive, startHour: 14, startMin: 30, durationMin: 45 },
    { domain: 'github.com', category: Category.productive, startHour: 15, startMin: 15, durationMin: 60 },
    { domain: 'notion.so', category: Category.productive, startHour: 16, startMin: 15, durationMin: 45 },
    { domain: 'figma.com', category: Category.productive, startHour: 17, startMin: 0, durationMin: 45 },
    { domain: 'leetcode.com', category: Category.productive, startHour: 17, startMin: 45, durationMin: 40 },
    { domain: 'chatgpt.com', category: Category.productive, startHour: 18, startMin: 25, durationMin: 45 },
    { domain: 'github.com', category: Category.productive, startHour: 19, startMin: 10, durationMin: 45 },
    { domain: 'localhost', category: Category.productive, startHour: 19, startMin: 55, durationMin: 45 },
    { domain: 'claude.ai', category: Category.productive, startHour: 20, startMin: 40, durationMin: 35 },
  ],
  '2026-10-20': [
    { domain: 'github.com', category: Category.productive, startHour: 9, startMin: 0, durationMin: 50 },
    { domain: 'claude.ai', category: Category.productive, startHour: 9, startMin: 50, durationMin: 55 },
    { domain: 'slack.com', category: Category.communication, startHour: 10, startMin: 45, durationMin: 30 },
    { domain: 'chatgpt.com', category: Category.productive, startHour: 11, startMin: 15, durationMin: 60 },
    { domain: 'youtube.com', category: Category.entertainment, startHour: 12, startMin: 15, durationMin: 30 },
    { domain: 'localhost', category: Category.productive, startHour: 14, startMin: 0, durationMin: 75 },
    { domain: 'notion.so', category: Category.productive, startHour: 15, startMin: 15, durationMin: 45 },
    { domain: 'github.com', category: Category.productive, startHour: 16, startMin: 0, durationMin: 60 },
    { domain: 'figma.com', category: Category.productive, startHour: 17, startMin: 0, durationMin: 40 },
    { domain: 'stackoverflow.com', category: Category.productive, startHour: 17, startMin: 40, durationMin: 35 },
  ],
  '2026-10-19': [
    { domain: 'github.com', category: Category.productive, startHour: 9, startMin: 30, durationMin: 60 },
    { domain: 'slack.com', category: Category.communication, startHour: 10, startMin: 30, durationMin: 30 },
    { domain: 'claude.ai', category: Category.productive, startHour: 11, startMin: 0, durationMin: 60 },
    { domain: 'localhost', category: Category.productive, startHour: 12, startMin: 0, durationMin: 45 },
    { domain: 'youtube.com', category: Category.entertainment, startHour: 12, startMin: 45, durationMin: 30 },
    { domain: 'chatgpt.com', category: Category.productive, startHour: 14, startMin: 15, durationMin: 60 },
    { domain: 'notion.so', category: Category.productive, startHour: 15, startMin: 15, durationMin: 50 },
    { domain: 'github.com', category: Category.productive, startHour: 16, startMin: 5, durationMin: 70 },
  ],
  '2026-10-18': [
    { domain: 'github.com', category: Category.productive, startHour: 8, startMin: 30, durationMin: 50 },
    { domain: 'claude.ai', category: Category.productive, startHour: 9, startMin: 20, durationMin: 55 },
    { domain: 'localhost', category: Category.productive, startHour: 10, startMin: 15, durationMin: 30 },
    { domain: 'slack.com', category: Category.communication, startHour: 10, startMin: 45, durationMin: 25 },
    { domain: 'github.com', category: Category.productive, startHour: 11, startMin: 10, durationMin: 60 },
    { domain: 'chatgpt.com', category: Category.productive, startHour: 12, startMin: 10, durationMin: 35 },
    { domain: 'youtube.com', category: Category.entertainment, startHour: 12, startMin: 45, durationMin: 30 },
    { domain: 'linkedin.com', category: Category.social, startHour: 13, startMin: 15, durationMin: 15 },
    { domain: 'notion.so', category: Category.productive, startHour: 14, startMin: 0, durationMin: 75 },
    { domain: 'github.com', category: Category.productive, startHour: 15, startMin: 15, durationMin: 75 },
    { domain: 'slack.com', category: Category.communication, startHour: 16, startMin: 30, durationMin: 30 },
  ],
};

async function main() {
  console.log('🚀 Populating Authentic Modern Developer Telemetry in PostgreSQL...');

  await seedDomainCategories();

  const user = await prisma.user.findFirst({
    where: { email: 'yashpathak086@gmail.com' },
  }) || await prisma.user.findFirst();

  if (!user) {
    throw new Error('No user found in database!');
  }

  const userId = user.id;

  // Profile setup
  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      occupationType: 'student',
      workStart: '09:00',
      workEnd: '18:00',
    },
    update: {
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      occupationType: 'student',
      workStart: '09:00',
      workEnd: '18:00',
    },
  });

  // Goals
  await prisma.goal.deleteMany({ where: { userId } });
  await prisma.goal.createMany({
    data: [
      {
        userId,
        type: GoalType.focus_minutes,
        period: GoalPeriod.daily,
        targetValue: 240,
      },
      {
        userId,
        type: GoalType.max_screen_minutes,
        period: GoalPeriod.daily,
        targetValue: 480,
      },
      {
        userId,
        type: GoalType.max_context_switches,
        period: GoalPeriod.daily,
        targetValue: 30,
      },
    ],
  });

  // Primary Device
  let device = await prisma.device.findFirst({
    where: { userId, revokedAt: null },
  });

  if (!device) {
    device = await prisma.device.create({
      data: {
        userId,
        name: 'Google Chrome',
        platform: 'chrome',
        tokenHash: crypto.randomBytes(32).toString('hex'),
      },
    });
  } else {
    device = await prisma.device.update({
      where: { id: device.id },
      data: { name: 'Google Chrome', platform: 'chrome' },
    });
  }

  const deviceId = device.id;

  // Clear existing activity data for a clean slate
  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.contextSwitch.deleteMany({ where: { userId } });
  await prisma.notificationEvent.deleteMany({ where: { userId } });
  await prisma.focusSession.deleteMany({ where: { userId } });

  const dates = Object.keys(DAILY_SCHEDULES);

  for (const dateStr of dates) {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1; // 0-indexed
    const day = Number(dayStr);

    const schedule = DAILY_SCHEDULES[dateStr] || [];

    // 1. Activity Logs
    const activities = schedule.map((act, idx) => {
      const totalMinutesIST = act.startHour * 60 + act.startMin;
      const totalMinutesUTC = totalMinutesIST - 330; // IST = UTC + 5:30
      const utcHours = Math.floor(totalMinutesUTC / 60);
      const utcMins = totalMinutesUTC % 60;

      const startedAt = new Date(Date.UTC(year, month, day, utcHours, utcMins, 0));
      const endedAt = new Date(startedAt.getTime() + act.durationMin * 60 * 1000);

      return {
        userId,
        deviceId,
        clientEventId: `act-${dateStr}-${idx}-${crypto.randomBytes(4).toString('hex')}`,
        domain: act.domain,
        category: act.category,
        startedAt,
        endedAt,
        durationSec: act.durationMin * 60,
        idle: false,
      };
    });

    await prisma.activityLog.createMany({ data: activities });

    // 2. Context Switches between activities
    const switches = [];
    for (let i = 0; i < schedule.length - 1; i++) {
      const fromAct = schedule[i];
      const toAct = schedule[i + 1];
      const totalMinutesIST = toAct.startHour * 60 + toAct.startMin;
      const totalMinutesUTC = totalMinutesIST - 330;
      const utcHours = Math.floor(totalMinutesUTC / 60);
      const utcMins = totalMinutesUTC % 60;
      const switchedAt = new Date(Date.UTC(year, month, day, utcHours, utcMins, 0));

      switches.push({
        userId,
        deviceId,
        clientEventId: `sw-${dateStr}-${i}-${crypto.randomBytes(4).toString('hex')}`,
        fromApp: fromAct.domain,
        toApp: toAct.domain,
        switchedAt,
      });
    }

    if (switches.length > 0) {
      await prisma.contextSwitch.createMany({ data: switches });
    }

    // 3. Notifications for this date
    const notifDescriptions = [
      'Slack (#engineering: Daily Standup in 5m)',
      'GitHub (PR #42: All CI/CD checks passed)',
      'Slack (@alex: API routes migrated to PostgreSQL)',
      'Claude (Generated full refactor response)',
      'Google Calendar (Architecture Sync with Tech Lead)',
      'GitHub (Release v1.0.0 created successfully)',
    ];

    const notifs = notifDescriptions.map((desc, idx) => {
      const totalMinutesIST = 10 * 60 + idx * 80; // Spread across work hours
      const totalMinutesUTC = totalMinutesIST - 330;
      const utcHours = Math.floor(totalMinutesUTC / 60);
      const utcMins = totalMinutesUTC % 60;
      const receivedAt = new Date(Date.UTC(year, month, day, utcHours, utcMins, 0));

      return {
        userId,
        deviceId,
        clientEventId: `notif-${dateStr}-${idx}-${crypto.randomBytes(4).toString('hex')}`,
        sourceApp: desc,
        receivedAt,
      };
    });

    await prisma.notificationEvent.createMany({ data: notifs });

    // 4. Focus Sessions for this date
    const focusBlocks = [
      { plannedMin: 90, startH: 9, startM: 15, interruptionCount: 1 },
      { plannedMin: 60, startH: 14, startM: 0, interruptionCount: 0 },
      { plannedMin: 90, startH: 18, startM: 0, interruptionCount: 0 },
    ];

    for (const fb of focusBlocks) {
      const totalMinIST = fb.startH * 60 + fb.startM;
      const totalMinUTC = totalMinIST - 330;
      const utcHours = Math.floor(totalMinUTC / 60);
      const utcMins = totalMinUTC % 60;

      const startedAt = new Date(Date.UTC(year, month, day, utcHours, utcMins, 0));
      const endedAt = new Date(startedAt.getTime() + fb.plannedMin * 60 * 1000);

      await prisma.focusSession.create({
        data: {
          userId,
          plannedMin: fb.plannedMin,
          startedAt,
          endedAt,
          status: FocusSessionStatus.completed,
          interruptionCount: fb.interruptionCount,
        },
      });
    }
  }

  // 5. Recompute Usage Rollups for all dates
  console.log('🔄 Calculating exact database rollups for all dates...');
  await recomputeUsageForDates(userId, dates);

  console.log(`✅ Successfully generated authentic telemetry across ${dates.length} days!`);
}

main()
  .catch((err) => {
    console.error('Error populating database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
