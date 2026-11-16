import {
  PrismaClient,
  Category,
  ActivitySource,
  FocusSessionStatus,
  TaskPriority,
  TaskStatus,
  GoalType,
  GoalPeriod,
  RecommendationCategory,
  RecommendationStatus,
} from '@prisma/client';
import crypto from 'node:crypto';
import process from 'node:process';
import { recomputeUsageForDates } from '../src/modules/usage/rollup.js';

const prisma = new PrismaClient();

// Helper to convert IST (UTC+5:30) date & time into UTC Date object
function istToUtc(year: number, month: number, day: number, hour: number, minute: number, second = 0): Date {
  const totalISTMinutes = hour * 60 + minute;
  const totalUTCMinutes = totalISTMinutes - 330; // IST = UTC + 5:30
  const utcHour = Math.floor(totalUTCMinutes / 60);
  const utcMinute = (totalUTCMinutes % 60 + 60) % 60;
  const dayOffset = Math.floor(totalUTCMinutes / 1440);

  return new Date(Date.UTC(year, month - 1, day + dayOffset, utcHour, utcMinute, second));
}

interface ActivityItem {
  name: string; // App name for desktop, domain for browser
  isBrowser: boolean;
  category: Category;
  startHour: number;
  startMin: number;
  durationMin: number;
}

interface DayPlan {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  activities: ActivityItem[];
  focusSessions: Array<{
    title: string;
    startHour: number;
    startMin: number;
    plannedMin: number;
    durationMin: number;
    status: FocusSessionStatus;
    interruptionCount: number;
  }>;
  notifications: Array<{
    app: string;
    count: number;
    hours: number[];
  }>;
}

const PRIMARY_DEMO_DAYS: DayPlan[] = [
  // ==========================================
  // DAY 1: 11 November 2026 (Wednesday) - Deep Focus Day (Score ~84)
  // ==========================================
  {
    dateStr: '2026-11-11',
    year: 2026,
    month: 11,
    day: 11,
    activities: [
      { name: 'Notion', isBrowser: false, category: Category.productive, startHour: 9, startMin: 15, durationMin: 25 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 9, startMin: 40, durationMin: 20 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 10, startMin: 0, durationMin: 30 },
      { name: 'Terminal', isBrowser: false, category: Category.productive, startHour: 10, startMin: 30, durationMin: 15 },
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 10, startMin: 45, durationMin: 10 },
      { name: 'github.com', isBrowser: true, category: Category.productive, startHour: 10, startMin: 55, durationMin: 45 },
      { name: 'chatgpt.com', isBrowser: true, category: Category.productive, startHour: 11, startMin: 40, durationMin: 45 },
      { name: 'Spotify', isBrowser: false, category: Category.entertainment, startHour: 12, startMin: 25, durationMin: 25 },
      // 12:50 - 13:50 Lunch break (offline)
      { name: 'docs.google.com', isBrowser: true, category: Category.productive, startHour: 13, startMin: 50, durationMin: 35 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 14, startMin: 25, durationMin: 35 },
      { name: 'web.telegram.org', isBrowser: true, category: Category.communication, startHour: 15, startMin: 0, durationMin: 12 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 15, startMin: 12, durationMin: 50 },
      { name: 'Terminal', isBrowser: false, category: Category.productive, startHour: 16, startMin: 2, durationMin: 18 },
      { name: 'Microsoft Word', isBrowser: false, category: Category.productive, startHour: 16, startMin: 20, durationMin: 30 },
      { name: 'Spotify', isBrowser: false, category: Category.entertainment, startHour: 16, startMin: 50, durationMin: 35 },
      { name: 'docs.google.com', isBrowser: true, category: Category.productive, startHour: 17, startMin: 25, durationMin: 40 },
      { name: 'github.com', isBrowser: true, category: Category.productive, startHour: 18, startMin: 5, durationMin: 25 },
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 18, startMin: 30, durationMin: 15 },
    ],
    focusSessions: [
      {
        title: 'Authentication & Security Architecture',
        startHour: 10,
        startMin: 0,
        plannedMin: 45,
        durationMin: 45,
        status: FocusSessionStatus.completed,
        interruptionCount: 0,
      },
      {
        title: 'Database Index Optimization',
        startHour: 14,
        startMin: 30,
        plannedMin: 25,
        durationMin: 25,
        status: FocusSessionStatus.completed,
        interruptionCount: 1,
      },
      {
        title: 'Documentation & Milestone Report',
        startHour: 17,
        startMin: 30,
        plannedMin: 30,
        durationMin: 30,
        status: FocusSessionStatus.completed,
        interruptionCount: 0,
      },
    ],
    notifications: [
      { app: 'WhatsApp', count: 8, hours: [10, 11, 14, 15, 17, 18] },
      { app: 'Slack', count: 4, hours: [10, 14, 16] },
      { app: 'Telegram', count: 2, hours: [15, 18] },
    ],
  },

  // ==========================================
  // DAY 2: 12 November 2026 (Thursday) - Distracted & Fragmented Day (Score ~52)
  // ==========================================
  {
    dateStr: '2026-11-12',
    year: 2026,
    month: 11,
    day: 12,
    activities: [
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 9, startMin: 30, durationMin: 20 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 9, startMin: 50, durationMin: 25 },
      { name: 'web.telegram.org', isBrowser: true, category: Category.communication, startHour: 10, startMin: 15, durationMin: 15 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 10, startMin: 30, durationMin: 12 },
      { name: 'instagram.com', isBrowser: true, category: Category.social, startHour: 10, startMin: 42, durationMin: 38 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 11, startMin: 20, durationMin: 20 },
      { name: 'youtube.com', isBrowser: true, category: Category.entertainment, startHour: 11, startMin: 40, durationMin: 35 },
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 12, startMin: 15, durationMin: 25 },
      // 12:40 - 13:30 Lunch
      { name: 'youtube.com', isBrowser: true, category: Category.entertainment, startHour: 13, startMin: 30, durationMin: 45 },
      { name: 'web.telegram.org', isBrowser: true, category: Category.communication, startHour: 14, startMin: 15, durationMin: 20 },
      { name: 'chatgpt.com', isBrowser: true, category: Category.productive, startHour: 14, startMin: 35, durationMin: 25 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 15, startMin: 0, durationMin: 30 },
      { name: 'instagram.com', isBrowser: true, category: Category.social, startHour: 15, startMin: 30, durationMin: 30 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 16, startMin: 0, durationMin: 25 },
      { name: 'Terminal', isBrowser: false, category: Category.productive, startHour: 16, startMin: 25, durationMin: 20 },
      { name: 'github.com', isBrowser: true, category: Category.productive, startHour: 16, startMin: 45, durationMin: 25 },
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 17, startMin: 10, durationMin: 35 },
      // 17:45 - 19:30 Offline break
      { name: 'netflix.com', isBrowser: true, category: Category.entertainment, startHour: 19, startMin: 30, durationMin: 85 },
      { name: 'Spotify', isBrowser: false, category: Category.entertainment, startHour: 20, startMin: 55, durationMin: 30 },
    ],
    focusSessions: [
      {
        title: 'Authentication Microservice Debugging',
        startHour: 10,
        startMin: 30,
        plannedMin: 25,
        durationMin: 12,
        status: FocusSessionStatus.abandoned,
        interruptionCount: 4,
      },
      {
        title: 'Fix frontend state management bug',
        startHour: 16,
        startMin: 0,
        plannedMin: 25,
        durationMin: 25,
        status: FocusSessionStatus.completed,
        interruptionCount: 1,
      },
    ],
    notifications: [
      { app: 'WhatsApp', count: 24, hours: [9, 10, 11, 12, 14, 15, 16, 17, 20] },
      { app: 'Telegram', count: 12, hours: [10, 12, 14, 17] },
      { app: 'Instagram', count: 8, hours: [10, 15, 19] },
      { app: 'Slack', count: 6, hours: [10, 11, 16] },
    ],
  },

  // ==========================================
  // DAY 3: 13 November 2026 (Friday - TODAY up to ~16:30 IST) - Disciplined Recovery (Score ~78)
  // Notice: ENDS AT 16:30 IST (11:00 UTC). Does NOT fill the remaining evening!
  // ==========================================
  {
    dateStr: '2026-11-13',
    year: 2026,
    month: 11,
    day: 13,
    activities: [
      { name: 'Notion', isBrowser: false, category: Category.productive, startHour: 9, startMin: 0, durationMin: 30 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 9, startMin: 30, durationMin: 15 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 9, startMin: 45, durationMin: 25 },
      { name: 'github.com', isBrowser: true, category: Category.productive, startHour: 10, startMin: 10, durationMin: 15 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 10, startMin: 25, durationMin: 45 },
      { name: 'docs.google.com', isBrowser: true, category: Category.productive, startHour: 11, startMin: 10, durationMin: 25 },
      { name: 'chatgpt.com', isBrowser: true, category: Category.productive, startHour: 11, startMin: 35, durationMin: 20 },
      { name: 'Spotify', isBrowser: false, category: Category.entertainment, startHour: 11, startMin: 55, durationMin: 20 },
      { name: 'web.whatsapp.com', isBrowser: true, category: Category.communication, startHour: 12, startMin: 15, durationMin: 18 },
      // 12:33 - 13:45 Lunch & Walk break (offline)
      { name: 'Microsoft Word', isBrowser: false, category: Category.productive, startHour: 13, startMin: 45, durationMin: 30 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 14, startMin: 15, durationMin: 30 },
      { name: 'Terminal', isBrowser: false, category: Category.productive, startHour: 14, startMin: 45, durationMin: 25 },
      { name: 'Notion', isBrowser: false, category: Category.productive, startHour: 15, startMin: 10, durationMin: 25 },
      { name: 'Visual Studio Code', isBrowser: false, category: Category.productive, startHour: 15, startMin: 35, durationMin: 40 },
      { name: 'localhost', isBrowser: true, category: Category.productive, startHour: 16, startMin: 15, durationMin: 15 },
      // EXACT STOP AT 16:30 IST!
    ],
    focusSessions: [
      {
        title: 'Finalize Milestone 1 Deliverables',
        startHour: 9,
        startMin: 45,
        plannedMin: 25,
        durationMin: 25,
        status: FocusSessionStatus.completed,
        interruptionCount: 0,
      },
      {
        title: 'Integration testing & bug fixes',
        startHour: 14,
        startMin: 45,
        plannedMin: 25,
        durationMin: 25,
        status: FocusSessionStatus.completed,
        interruptionCount: 0,
      },
    ],
    notifications: [
      { app: 'WhatsApp', count: 7, hours: [9, 11, 12, 14, 15] },
      { app: 'Slack', count: 3, hours: [10, 14] },
      { app: 'Telegram', count: 2, hours: [11, 15] },
    ],
  },
];

export async function seedPresentationDemo(options: { cleanOnly?: boolean } = {}) {
  console.log('🎯 Preparing Authentic 3-Day Presentation Telemetry (11, 12, 13 Nov 2026)...');

  // 1. PRIMARY ADMIN USER (Yash Pathak)
  const adminUser = await prisma.user.findFirst({
    where: { email: 'yashpathak086@gmail.com' },
  });

  if (!adminUser) {
    throw new Error('Target user yashpathak086@gmail.com not found in database!');
  }
  const userId = adminUser.id;

  // Secondary Student User (Yash Student)
  const studentUser = await prisma.user.findFirst({
    where: { email: 'pathak.yash775@gmail.com' },
  });

  // Ensure Profile is set to Asia/Kolkata
  await prisma.profile.upsert({
    where: { userId },
    update: {
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      workStart: '09:00',
      workEnd: '18:00',
    },
    create: {
      userId,
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      workStart: '09:00',
      workEnd: '18:00',
    },
  });

  if (studentUser) {
    await prisma.profile.upsert({
      where: { userId: studentUser.id },
      update: {
        displayName: 'Yash (Student)',
        timezone: 'Asia/Kolkata',
        workStart: '10:00',
        workEnd: '19:00',
      },
      create: {
        userId: studentUser.id,
        displayName: 'Yash (Student)',
        timezone: 'Asia/Kolkata',
        workStart: '10:00',
        workEnd: '19:00',
      },
    });
  }

  // Find or create Primary Desktop & Chrome devices for Admin
  let windowsDevice = await prisma.device.findFirst({
    where: { userId, platform: 'windows', revokedAt: null },
  });
  if (!windowsDevice) {
    windowsDevice = await prisma.device.create({
      data: {
        userId,
        name: 'DESKTOP-IQ1QPB7 (Windows Desktop)',
        platform: 'windows',
        tokenHash: crypto.randomBytes(32).toString('hex'),
        lastSeenAt: istToUtc(2026, 11, 13, 16, 30),
      },
    });
  } else {
    await prisma.device.update({
      where: { id: windowsDevice.id },
      data: { lastSeenAt: istToUtc(2026, 11, 13, 16, 30) },
    });
  }

  let chromeDevice = await prisma.device.findFirst({
    where: { userId, platform: 'chrome', revokedAt: null },
  });
  if (!chromeDevice) {
    chromeDevice = await prisma.device.create({
      data: {
        userId,
        name: 'Google Chrome (Yash Pathak)',
        platform: 'chrome',
        tokenHash: crypto.randomBytes(32).toString('hex'),
        lastSeenAt: istToUtc(2026, 11, 13, 16, 30),
      },
    });
  } else {
    await prisma.device.update({
      where: { id: chromeDevice.id },
      data: { lastSeenAt: istToUtc(2026, 11, 13, 16, 30) },
    });
  }

  // Clean previous demo data for target dates
  const targetDateRange = {
    gte: istToUtc(2026, 11, 11, 0, 0),
    lte: istToUtc(2026, 11, 13, 23, 59),
  };

  const userIdsToClean = [userId];
  if (studentUser) userIdsToClean.push(studentUser.id);

  console.log('🧹 Cleaning previous records for target dates...');
  await prisma.activityLog.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      startedAt: targetDateRange,
    },
  });

  await prisma.contextSwitch.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      switchedAt: targetDateRange,
    },
  });

  await prisma.notificationEvent.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      receivedAt: targetDateRange,
    },
  });

  await prisma.focusSession.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      startedAt: targetDateRange,
    },
  });

  await prisma.dailyUsageStat.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      date: { in: ['2026-11-11', '2026-11-12', '2026-11-13'] },
    },
  });

  await prisma.hourlyUsagePattern.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      date: { in: ['2026-11-11', '2026-11-12', '2026-11-13'] },
    },
  });

  await prisma.smartAlert.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      createdAt: targetDateRange,
    },
  });

  await prisma.aIInsight.deleteMany({
    where: {
      userId: { in: userIdsToClean },
      createdAt: targetDateRange,
    },
  });

  if (options.cleanOnly) {
    console.log('✅ Demo data cleanup complete.');
    return;
  }

  // 2. SEED REALISTIC TASKS FOR ADMIN
  console.log('📋 Updating Presentation Tasks & Goals...');
  const existingTasks = await prisma.task.findMany({ where: { userId } });
  const taskMap = new Map(existingTasks.map((t) => [t.title, t]));

  const sampleTasks = [
    {
      title: 'Authentication & Security Architecture',
      description: 'Implement JWT refresh tokens, role-based admin gates, and rate limiting.',
      category: 'backend',
      priority: TaskPriority.urgent,
      status: TaskStatus.completed,
      completedAt: istToUtc(2026, 11, 11, 10, 50),
      deadline: istToUtc(2026, 11, 11, 18, 0),
    },
    {
      title: 'Database Index Optimization',
      description: 'Create compound indexes on ActivityLog and rollup cache tables.',
      category: 'database',
      priority: TaskPriority.medium,
      status: TaskStatus.completed,
      completedAt: istToUtc(2026, 11, 11, 15, 0),
      deadline: istToUtc(2026, 11, 11, 18, 0),
    },
    {
      title: 'Fix frontend state management bug',
      description: 'Resolve stale focus timer state on route change.',
      category: 'bugfix',
      priority: TaskPriority.high,
      status: TaskStatus.completed,
      completedAt: istToUtc(2026, 11, 12, 16, 30),
      deadline: istToUtc(2026, 11, 12, 18, 0),
    },
    {
      title: 'Finalize Milestone 1 Deliverables',
      description: 'Complete cross-platform verification and presentation slides.',
      category: 'documentation',
      priority: TaskPriority.urgent,
      status: TaskStatus.completed,
      completedAt: istToUtc(2026, 11, 13, 10, 15),
      deadline: istToUtc(2026, 11, 13, 12, 0),
    },
    {
      title: 'Milestone 1 Presentation Preparation',
      description: 'Rehearse live demo walkthrough and highlight real-time AI recommendations.',
      category: 'presentation',
      priority: TaskPriority.high,
      status: TaskStatus.in_progress,
      deadline: istToUtc(2026, 11, 13, 18, 0),
    },
    {
      title: 'Model Retraining Pipeline Evaluation',
      description: 'Evaluate Random Forest vs XGBoost accuracy on extended telemetry dataset.',
      category: 'ai_ml',
      priority: TaskPriority.medium,
      status: TaskStatus.todo,
      deadline: istToUtc(2026, 11, 16, 12, 0),
    },
  ];

  for (const t of sampleTasks) {
    if (taskMap.has(t.title)) {
      await prisma.task.update({
        where: { id: taskMap.get(t.title)!.id },
        data: {
          status: t.status,
          priority: t.priority,
          completedAt: t.completedAt ?? null,
          deadline: t.deadline ?? null,
        },
      });
    } else {
      const created = await prisma.task.create({
        data: {
          userId,
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          completedAt: t.completedAt ?? null,
          deadline: t.deadline ?? null,
        },
      });
      taskMap.set(t.title, created);
    }
  }

  // 3. SEED GOALS
  await prisma.goal.deleteMany({ where: { userId } });
  await prisma.goal.createMany({
    data: [
      {
        userId,
        type: GoalType.focus_minutes,
        period: GoalPeriod.daily,
        targetValue: 240, // 4 hours
      },
      {
        userId,
        type: GoalType.max_screen_minutes,
        period: GoalPeriod.daily,
        targetValue: 480, // 8 hours
      },
      {
        userId,
        type: GoalType.max_context_switches,
        period: GoalPeriod.daily,
        targetValue: 30,
      },
    ],
  });

  // 4. SEED RAW ACTIVITY LOGS, CONTEXT SWITCHES, NOTIFICATIONS, FOCUS SESSIONS FOR ADMIN
  console.log('⚡ Generating authentic activity logs and context transitions...');

  for (const day of PRIMARY_DEMO_DAYS) {
    const activityData = [];
    const switchData = [];
    const notificationData = [];
    let previousApp: { name: string; isBrowser: boolean; endUtc: Date } | null = null;

    // A. Activities (Strictly adhering to activity_log_source_check constraint!)
    for (let i = 0; i < day.activities.length; i++) {
      const act = day.activities[i];
      const startedAt = istToUtc(day.year, day.month, day.day, act.startHour, act.startMin, 0);
      const endedAt = new Date(startedAt.getTime() + act.durationMin * 60 * 1000);
      const deviceId = act.isBrowser ? chromeDevice.id : windowsDevice.id;
      const clientEventId = `demo_${day.dateStr.replace(/-/g, '')}_act_${i + 1}_${crypto.randomBytes(3).toString('hex')}`;

      activityData.push({
        userId,
        deviceId,
        clientEventId,
        source: act.isBrowser ? ActivitySource.browser : ActivitySource.desktop,
        domain: act.isBrowser ? act.name : null,
        appName: act.isBrowser ? null : act.name,
        category: act.category,
        startedAt,
        endedAt,
        durationSec: act.durationMin * 60,
        idle: false,
      });

      // Context switch from previous app
      if (previousApp && previousApp.name !== act.name) {
        const switchTime = new Date(startedAt.getTime() - 2000); // 2s before start
        switchData.push({
          userId,
          deviceId,
          clientEventId: `demo_${day.dateStr.replace(/-/g, '')}_sw_${i}_${crypto.randomBytes(3).toString('hex')}`,
          fromApp: previousApp.name,
          toApp: act.name,
          switchedAt: switchTime,
        });
      }

      previousApp = { name: act.name, isBrowser: act.isBrowser, endUtc: endedAt };
    }

    // Insert activities & switches in bulk
    await prisma.activityLog.createMany({ data: activityData });
    if (switchData.length > 0) {
      await prisma.contextSwitch.createMany({ data: switchData });
    }

    // B. Extra realistic micro-switches for Thursday (to reflect 80+ switches)
    if (day.dateStr === '2026-11-12') {
      const extraSwitches = [];
      const chaoticApps = ['Visual Studio Code', 'web.whatsapp.com', 'instagram.com', 'web.telegram.org', 'youtube.com'];
      for (let s = 0; s < 55; s++) {
        const fromA = chaoticApps[s % chaoticApps.length];
        const toA = chaoticApps[(s + 1) % chaoticApps.length];
        const hour = 10 + Math.floor(s / 8); // spread across 10:00 to 17:00
        const min = (s * 7) % 60;
        extraSwitches.push({
          userId,
          deviceId: chromeDevice.id,
          clientEventId: `demo_${day.dateStr.replace(/-/g, '')}_micro_sw_${s}_${crypto.randomBytes(3).toString('hex')}`,
          fromApp: fromA,
          toApp: toA,
          switchedAt: istToUtc(day.year, day.month, day.day, hour, min, (s * 13) % 60),
        });
      }
      await prisma.contextSwitch.createMany({ data: extraSwitches });
    }

    // C. Notifications
    for (const notifGroup of day.notifications) {
      const notifsPerSlot = Math.ceil(notifGroup.count / notifGroup.hours.length);
      let remaining = notifGroup.count;

      for (const h of notifGroup.hours) {
        const thisSlot = Math.min(remaining, notifsPerSlot);
        for (let k = 0; k < thisSlot; k++) {
          const m = (k * 17 + 8) % 60;
          notificationData.push({
            userId,
            deviceId: chromeDevice.id,
            clientEventId: `demo_${day.dateStr.replace(/-/g, '')}_notif_${notifGroup.app}_${h}_${k}_${crypto.randomBytes(2).toString('hex')}`,
            sourceApp: notifGroup.app,
            receivedAt: istToUtc(day.year, day.month, day.day, h, m, 15),
          });
          remaining--;
        }
      }
    }
    if (notificationData.length > 0) {
      await prisma.notificationEvent.createMany({ data: notificationData });
    }

    // D. Focus Sessions
    for (const fs of day.focusSessions) {
      const startedAt = istToUtc(day.year, day.month, day.day, fs.startHour, fs.startMin, 0);
      const endedAt = new Date(startedAt.getTime() + fs.durationMin * 60 * 1000);
      const matchedTask = taskMap.get(fs.title);

      await prisma.focusSession.create({
        data: {
          userId,
          taskId: matchedTask?.id ?? null,
          plannedMin: fs.plannedMin,
          startedAt,
          endedAt,
          status: fs.status,
          interruptionCount: fs.interruptionCount,
          createdAt: startedAt,
        },
      });
    }
  }

  // 5. SEED LIGHTWEIGHT DEMO DATA FOR STUDENT USER (for Admin User Inspection)
  if (studentUser) {
    const studentDevice = await prisma.device.findFirst({
      where: { userId: studentUser.id, platform: 'chrome', revokedAt: null },
    });
    if (studentDevice) {
      const studentActs = [
        // 11 Nov
        { domain: 'leetcode.com', cat: Category.productive, date: [2026, 11, 11], h: 10, m: 0, dur: 45 },
        { domain: 'takeuforward.org', cat: Category.productive, date: [2026, 11, 11], h: 10, m: 50, dur: 35 },
        { domain: 'youtube.com', cat: Category.entertainment, date: [2026, 11, 11], h: 11, m: 30, dur: 25 },
        // 12 Nov
        { domain: 'github.com', cat: Category.productive, date: [2026, 11, 12], h: 11, m: 0, dur: 40 },
        { domain: 'leetcode.com', cat: Category.productive, date: [2026, 11, 12], h: 11, m: 45, dur: 50 },
        { domain: 'instagram.com', cat: Category.social, date: [2026, 11, 12], h: 14, m: 0, dur: 30 },
        // 13 Nov
        { domain: 'takeuforward.org', cat: Category.productive, date: [2026, 11, 13], h: 10, m: 15, dur: 40 },
        { domain: 'leetcode.com', cat: Category.productive, date: [2026, 11, 13], h: 11, m: 0, dur: 35 },
      ];

      const studentLogs = studentActs.map((s, idx) => {
        const startedAt = istToUtc(s.date[0], s.date[1], s.date[2], s.h, s.m, 0);
        const endedAt = new Date(startedAt.getTime() + s.dur * 60 * 1000);
        return {
          userId: studentUser.id,
          deviceId: studentDevice.id,
          clientEventId: `demo_student_act_${idx}_${crypto.randomBytes(3).toString('hex')}`,
          source: ActivitySource.browser,
          domain: s.domain,
          appName: null,
          category: s.cat,
          startedAt,
          endedAt,
          durationSec: s.dur * 60,
          idle: false,
        };
      });
      await prisma.activityLog.createMany({ data: studentLogs });

      // Student focus session
      await prisma.focusSession.create({
        data: {
          userId: studentUser.id,
          plannedMin: 45,
          startedAt: istToUtc(2026, 11, 11, 10, 0, 0),
          endedAt: istToUtc(2026, 11, 11, 10, 45, 0),
          status: FocusSessionStatus.completed,
          interruptionCount: 0,
        },
      });

      // Student rollup
      await recomputeUsageForDates(studentUser.id, ['2026-11-11', '2026-11-12', '2026-11-13']);
    }
  }

  // 6. RECOMPUTE DAILY STATS & HOURLY USAGE PATTERNS FOR PRIMARY USER
  console.log('🔄 Executing accurate rollup calculation for all 3 days...');
  await recomputeUsageForDates(userId, ['2026-11-11', '2026-11-12', '2026-11-13']);

  // 7. SEED SMART ALERTS & AI INSIGHTS
  console.log('💡 Generating authentic AI Insights and Smart Alerts...');
  await prisma.smartAlert.createMany({
    data: [
      {
        userId,
        type: 'milestone',
        title: 'Deep Work Milestone Reached',
        message: 'Achieved 4+ hours of focused productive time with 0 interruptions during morning blocks.',
        severity: 'success',
        read: true,
        createdAt: istToUtc(2026, 11, 11, 18, 30),
      },
      {
        userId,
        type: 'warning',
        title: 'High Context Switching Spike',
        message: 'Recorded 80+ window switches. Frequent context shifts to social and messaging apps depleted focus stamina.',
        severity: 'warning',
        read: true,
        createdAt: istToUtc(2026, 11, 12, 11, 0),
      },
      {
        userId,
        type: 'interruption',
        title: 'Focus Session Abandoned',
        message: 'Planned 25-minute focus session was interrupted after 12 minutes due to frequent notification triggers.',
        severity: 'warning',
        read: true,
        createdAt: istToUtc(2026, 11, 12, 10, 45),
      },
      {
        userId,
        type: 'recovery',
        title: 'Focus Rhythm Restored',
        message: 'Completed 2 uninterrupted 25-minute Pomodoro sessions today. Productivity index returned to 78%.',
        severity: 'info',
        read: false,
        createdAt: istToUtc(2026, 11, 13, 15, 20),
      },
    ],
  });

  // Seed AI Insights
  await prisma.aIInsight.createMany({
    data: [
      {
        userId,
        type: 'daily_synthesis',
        title: 'Attention Resilience & Rhythm Recovery',
        content:
          'Following Thursday’s attention fragmentation (52 Focus Score, 80+ switches), Friday’s workflow showed disciplined recovery with 78 Focus Score and zero session interruptions.',
        metadata: {
          topFocusBlock: '09:00 - 11:30 IST',
          primaryProductiveApp: 'Visual Studio Code',
          suggestedNextSession: 25,
        },
        createdAt: istToUtc(2026, 11, 13, 16, 20),
      },
      {
        userId,
        type: 'trend_analysis',
        title: '3-Day Multi-Day Attention Pattern',
        content:
          'Wednesday demonstrated peak architecture focus (84 Score). Thursday experienced social media infiltration (Netflix/YouTube/Instagram ~3h 15m). Friday effectively stabilized through structured 25-minute intervals.',
        metadata: {
          threeDayAverage: 71,
          peakCognitiveWindow: '09:30 - 11:30',
        },
        createdAt: istToUtc(2026, 11, 13, 16, 25),
      },
    ],
  });

  // 8. SEED CLEAN, DIRECT RECOMMENDATIONS
  console.log('✨ Updating AI Recommendations grounded in telemetry...');
  await prisma.recommendation.deleteMany({ where: { userId } });
  await prisma.recommendation.createMany({
    data: [
      {
        userId,
        category: RecommendationCategory.focus_improvement,
        title: 'Protect Your Morning Cognitive Peak (09:00 - 11:30)',
        description:
          'Your focus telemetry shows highest uninterrupted deep work stamina before 11:30 AM. Reserve this window exclusively for complex system architecture and coding.',
        reason: 'Morning focus sessions achieved 100% completion rate across all 3 days.',
        impactScore: 9,
        status: RecommendationStatus.pending,
        createdAt: istToUtc(2026, 11, 13, 16, 0),
      },
      {
        userId,
        category: RecommendationCategory.distraction_reduction,
        title: 'Batch Messaging Apps at 12:30 and 17:00',
        description:
          'WhatsApp and Telegram accounted for 42% of context switches on Thursday, triggering an abandoned focus session. Group notifications into designated midday and evening windows.',
        reason: 'Context switches spiked to 82 on Thursday when messaging apps remained open.',
        impactScore: 8,
        status: RecommendationStatus.pending,
        createdAt: istToUtc(2026, 11, 13, 16, 5),
      },
      {
        userId,
        category: RecommendationCategory.break_scheduling,
        title: 'Take a 10-Minute Offline Walk at 14:00',
        description:
          'A cognitive dip is observable around 14:00. Stepping away from screens for a brief walk restores prefrontal stamina better than passive video watching.',
        reason: 'Afternoon focus stamina improves by 35% following offline restorative breaks.',
        impactScore: 7,
        status: RecommendationStatus.pending,
        createdAt: istToUtc(2026, 11, 13, 16, 10),
      },
      {
        userId,
        category: RecommendationCategory.habit_formation,
        title: 'Maintain 25-Minute Focus Blocks',
        description:
          'Your 25-minute Pomodoro intervals had zero interruptions on Friday. Continue anchoring deep work with structured 25-minute blocks.',
        reason: 'Consistent short intervals prevent mental fatigue and maintain high task velocity.',
        impactScore: 8,
        status: RecommendationStatus.pending,
        createdAt: istToUtc(2026, 11, 13, 16, 15),
      },
    ],
  });

  // 9. SEED ADMIN AUDIT LOGS FOR PRESENTATION
  console.log('🛡️ Ensuring Admin Audit Log records exist...');
  const existingAudit = await prisma.adminAuditLog.count({ where: { adminId: userId } });
  if (existingAudit === 0) {
    await prisma.adminAuditLog.createMany({
      data: [
        {
          adminId: userId,
          action: 'USER_STATUS_UPDATED',
          targetId: studentUser ? studentUser.id : 'a5967b14-b6b2-46f4-bd8f-503c70c96900',
          details: { email: 'pathak.yash775@gmail.com', newStatus: 'ACTIVE', reason: 'Verified student onboarding' },
          createdAt: istToUtc(2026, 11, 12, 14, 20),
        },
        {
          adminId: userId,
          action: 'SECURITY_AUDIT_VERIFIED',
          targetId: userId,
          details: { scope: 'USER_MANAGEMENT', status: 'COMPLIANT' },
          createdAt: istToUtc(2026, 11, 13, 11, 0),
        },
      ],
    });
  }

  console.log('🎉 REALISTIC 3-DAY DEMO DATASET SEEDING SUCCESSFULLY COMPLETED!');
  console.log('   - 11 Nov 2026: Productive Deep Work (Score ~84, 5h 25m active)');
  console.log('   - 12 Nov 2026: Fragmented / Distracted (Score ~52, 6h 15m active, 80+ switches)');
  console.log('   - 13 Nov 2026: Disciplined Recovery (Score ~78, 3h 55m active up to 16:30 IST)');
}

async function main() {
  const isCleanOnly = process.argv.includes('--clean');
  await seedPresentationDemo({ cleanOnly: isCleanOnly });
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
