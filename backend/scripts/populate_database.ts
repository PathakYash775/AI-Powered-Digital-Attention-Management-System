import { PrismaClient, Category, FocusSessionStatus, GoalType, GoalPeriod } from '@prisma/client';
import crypto from 'node:crypto';
import { recomputeUsageForDates } from '../src/modules/usage/rollup.js';
import { seedDomainCategories } from '../prisma/seed.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Populating Authentic Modern Developer Telemetry for Yash Pathak in PostgreSQL...');

  // 1. Ensure domain categories are seeded
  await seedDomainCategories();

  const user = await prisma.user.findFirst({
    where: { email: 'yashpathak086@gmail.com' },
  });

  if (!user) {
    throw new Error('User yashpathak086@gmail.com not found in database!');
  }

  const userId = user.id;

  // 2. Ensure Profile is configured with Asia/Kolkata
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

  // 3. Ensure Goals are set
  await prisma.goal.deleteMany({ where: { userId } });
  await prisma.goal.createMany({
    data: [
      {
        userId,
        type: GoalType.focus_minutes,
        period: GoalPeriod.daily,
        targetValue: 240, // 4 hours deep work
      },
      {
        userId,
        type: GoalType.max_screen_minutes,
        period: GoalPeriod.daily,
        targetValue: 480, // 8 hours max screen limit
      },
      {
        userId,
        type: GoalType.max_context_switches,
        period: GoalPeriod.daily,
        targetValue: 30, // stay under 30 task switches
      },
    ],
  });

  // 4. Ensure a primary device exists
  let device = await prisma.device.findFirst({
    where: { userId, revokedAt: null },
  });

  if (!device) {
    device = await prisma.device.create({
      data: {
        userId,
        name: 'Chrome Browser (Laptop)',
        platform: 'chrome',
        tokenHash: crypto.randomBytes(32).toString('hex'),
      },
    });
  }

  const deviceId = device.id;

  // Clear existing activity logs to ensure fresh authentic data
  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.contextSwitch.deleteMany({ where: { userId } });
  await prisma.notificationEvent.deleteMany({ where: { userId } });
  await prisma.focusSession.deleteMany({ where: { userId } });

  // 5. Authentic Real-World Developer Activities for 2026-10-18 (IST timezone = UTC + 5h30m)
  // Stack: GitHub, ChatGPT, Claude, Localhost, Notion, Slack, YouTube, LinkedIn
  const rawActivities = [
    // 08:30 - 09:20 IST (03:00 - 03:50 UTC) - Morning GitHub PR review & commits
    {
      domain: 'github.com',
      category: Category.productive,
      startHour: 8,
      startMin: 30,
      durationMin: 50,
    },
    // 09:20 - 10:15 IST (03:50 - 04:45 UTC) - AI Pair Programming with Claude
    {
      domain: 'claude.ai',
      category: Category.productive,
      startHour: 9,
      startMin: 20,
      durationMin: 55,
    },
    // 10:15 - 10:45 IST (04:45 - 05:15 UTC) - Local App Testing on dev server
    {
      domain: 'localhost',
      category: Category.productive,
      startHour: 10,
      startMin: 15,
      durationMin: 30,
    },
    // 10:45 - 11:10 IST (05:15 - 05:40 UTC) - Slack Engineering Standup & discussion
    {
      domain: 'slack.com',
      category: Category.communication,
      startHour: 10,
      startMin: 45,
      durationMin: 25,
    },
    // 11:10 - 12:10 IST (05:40 - 06:40 UTC) - Deep coding & Git pushes
    {
      domain: 'github.com',
      category: Category.productive,
      startHour: 11,
      startMin: 10,
      durationMin: 60,
    },
    // 12:10 - 12:45 IST (06:40 - 07:15 UTC) - AI debugging & prompt iterations with ChatGPT
    {
      domain: 'chatgpt.com',
      category: Category.productive,
      startHour: 12,
      startMin: 10,
      durationMin: 35,
    },
    // 12:45 - 13:15 IST (07:15 - 07:45 UTC) - Lo-fi focus music / dev stream
    {
      domain: 'youtube.com',
      category: Category.entertainment,
      startHour: 12,
      startMin: 45,
      durationMin: 30,
    },
    // 13:15 - 13:30 IST (07:45 - 08:00 UTC) - Quick tech news / break
    {
      domain: 'linkedin.com',
      category: Category.social,
      startHour: 13,
      startMin: 15,
      durationMin: 15,
    },
    // 14:00 - 15:15 IST (08:30 - 09:45 UTC) - Product Architecture Specs & Tasks on Notion
    {
      domain: 'notion.so',
      category: Category.productive,
      startHour: 14,
      startMin: 0,
      durationMin: 75,
    },
    // 15:15 - 16:30 IST (09:45 - 11:00 UTC) - Core full-stack coding & verification
    {
      domain: 'github.com',
      category: Category.productive,
      startHour: 15,
      startMin: 15,
      durationMin: 75,
    },
    // 16:30 - 17:00 IST (11:00 - 11:30 UTC) - Team sync on Slack
    {
      domain: 'slack.com',
      category: Category.communication,
      startHour: 16,
      startMin: 30,
      durationMin: 30,
    },
  ];

  const activityData = rawActivities.map((act, idx) => {
    const totalMinutesIST = act.startHour * 60 + act.startMin;
    const totalMinutesUTC = totalMinutesIST - 330; // 5h30m = 330m
    const utcHours = Math.floor(totalMinutesUTC / 60);
    const utcMins = totalMinutesUTC % 60;

    const startedAt = new Date(Date.UTC(2026, 9, 18, utcHours, utcMins, 0));
    const endedAt = new Date(startedAt.getTime() + act.durationMin * 60 * 1000);

    return {
      userId,
      deviceId,
      clientEventId: `act-20261018-${idx}-${crypto.randomBytes(4).toString('hex')}`,
      domain: act.domain,
      category: act.category,
      startedAt,
      endedAt,
      durationSec: act.durationMin * 60,
      idle: false,
    };
  });

  await prisma.activityLog.createMany({ data: activityData });
  console.log(`✅ Created ${activityData.length} Real Developer Activity Logs`);

  // 6. Real-World Developer Context Switches
  const switchPairs = [
    { from: 'VS Code', to: 'Chrome (github.com)', minOffset: 20 },
    { from: 'Chrome (github.com)', to: 'Terminal (pnpm dev)', minOffset: 45 },
    { from: 'Terminal (pnpm dev)', to: 'VS Code', minOffset: 55 },
    { from: 'VS Code', to: 'Claude (claude.ai)', minOffset: 85 },
    { from: 'Claude (claude.ai)', to: 'VS Code', minOffset: 120 },
    { from: 'VS Code', to: 'Chrome (localhost:5173)', minOffset: 140 },
    { from: 'Chrome (localhost:5173)', to: 'VS Code', minOffset: 160 },
    { from: 'VS Code', to: 'Slack (#engineering)', minOffset: 180 },
    { from: 'Slack (#engineering)', to: 'VS Code', minOffset: 205 },
    { from: 'VS Code', to: 'ChatGPT (chatgpt.com)', minOffset: 235 },
    { from: 'ChatGPT (chatgpt.com)', to: 'VS Code', minOffset: 260 },
    { from: 'VS Code', to: 'YouTube (Lo-fi Coding)', minOffset: 285 },
    { from: 'YouTube (Lo-fi Coding)', to: 'LinkedIn', minOffset: 310 },
    { from: 'LinkedIn', to: 'Notion (Sprint Specs)', minOffset: 335 },
    { from: 'Notion (Sprint Specs)', to: 'VS Code', minOffset: 380 },
    { from: 'VS Code', to: 'Chrome (github.com)', minOffset: 440 },
    { from: 'Chrome (github.com)', to: 'Slack (#engineering)', minOffset: 485 },
  ];

  const switchData = switchPairs.map((sw, idx) => {
    const switchedAt = new Date(Date.UTC(2026, 9, 18, 3, 0 + sw.minOffset, 0));
    return {
      userId,
      deviceId,
      clientEventId: `sw-20261018-${idx}-${crypto.randomBytes(4).toString('hex')}`,
      fromApp: sw.from,
      toApp: sw.to,
      switchedAt,
    };
  });

  await prisma.contextSwitch.createMany({ data: switchData });
  console.log(`✅ Created ${switchData.length} Real Context Switches`);

  // 7. Real-World Developer Notifications
  const notifList = [
    { sourceApp: 'Slack (#engineering: Daily Standup in 5m)', offsetMin: 60 },
    { sourceApp: 'GitHub (PR #42: All CI/CD checks passed)', offsetMin: 110 },
    { sourceApp: 'Slack (@alex: API routes migrated to PostgreSQL)', offsetMin: 175 },
    { sourceApp: 'Claude (Generated full refactor response)', offsetMin: 220 },
    { sourceApp: 'Google Calendar (Architecture Sync with Tech Lead)', offsetMin: 320 },
    { sourceApp: 'GitHub (Release v1.0.0 created successfully)', offsetMin: 450 },
  ];

  const notifData = notifList.map((n, idx) => {
    const receivedAt = new Date(Date.UTC(2026, 9, 18, 3, 0 + n.offsetMin, 0));
    return {
      userId,
      deviceId,
      clientEventId: `notif-20261018-${idx}-${crypto.randomBytes(4).toString('hex')}`,
      sourceApp: n.sourceApp,
      receivedAt,
    };
  });

  await prisma.notificationEvent.createMany({ data: notifData });
  console.log(`✅ Created ${notifData.length} Real Notification Events`);

  // 8. Real-World Focus Sessions
  const sessions = [
    {
      plannedMin: 90,
      startedAt: new Date(Date.UTC(2026, 9, 18, 3, 30, 0)), // 09:00 IST
      endedAt: new Date(Date.UTC(2026, 9, 18, 5, 0, 0)),   // 10:30 IST
      status: FocusSessionStatus.completed,
      interruptionCount: 1,
    },
    {
      plannedMin: 60,
      startedAt: new Date(Date.UTC(2026, 9, 18, 5, 45, 0)), // 11:15 IST
      endedAt: new Date(Date.UTC(2026, 9, 18, 6, 45, 0)),   // 12:15 IST
      status: FocusSessionStatus.completed,
      interruptionCount: 0,
    },
    {
      plannedMin: 90,
      startedAt: new Date(Date.UTC(2026, 9, 18, 8, 30, 0)), // 14:00 IST
      endedAt: new Date(Date.UTC(2026, 9, 18, 10, 0, 0)),   // 15:30 IST
      status: FocusSessionStatus.completed,
      interruptionCount: 0,
    },
  ];

  for (const s of sessions) {
    await prisma.focusSession.create({
      data: {
        userId,
        plannedMin: s.plannedMin,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        interruptionCount: s.interruptionCount,
      },
    });
  }
  console.log(`✅ Created ${sessions.length} Focus Sessions`);

  // 9. Recompute Usage Rollups via official Rollup Engine into PostgreSQL
  console.log('🔄 Calculating exact database rollups for PostgreSQL...');
  await recomputeUsageForDates(userId, ['2026-10-18']);

  // 10. Inspect and Print All Database Tables
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const goals = await prisma.goal.findMany({ where: { userId } });
  const stats = await prisma.dailyUsageStat.findUnique({
    where: { userId_date: { userId, date: '2026-10-18' } },
  });
  const hourlyCount = await prisma.hourlyUsagePattern.count({
    where: { userId, date: '2026-10-18' },
  });
  const actCount = await prisma.activityLog.count({ where: { userId } });
  const swCount = await prisma.contextSwitch.count({ where: { userId } });
  const notCount = await prisma.notificationEvent.count({ where: { userId } });
  const focCount = await prisma.focusSession.count({ where: { userId } });

  console.log('\n======================================================');
  console.log('🎉 AUTHENTIC MODERN DEVELOPER TELEMETRY RECORDED IN POSTGRESQL');
  console.log('======================================================');
  console.log('User Profile:', profile);
  console.log('Goals Configured:', goals.map(g => `${g.type}: ${g.targetValue} (${g.period})`));
  console.log('Activity Logs Count:', actCount);
  console.log('Context Switches Count:', swCount);
  console.log('Notification Events Count:', notCount);
  console.log('Focus Sessions Count:', focCount);
  console.log('Hourly Usage Patterns Computed:', hourlyCount);
  console.log('\nDaily Usage Summary (PostgreSQL Row):');
  console.log(JSON.stringify(stats, null, 2));
  console.log('======================================================');
}

main()
  .catch((err) => {
    console.error('Error populating database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
