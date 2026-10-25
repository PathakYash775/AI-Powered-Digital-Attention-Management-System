import type {
  ActivityNotification,
  ActivitySession,
  ActivitySummary,
  Goal,
  Profile,
  SessionCategory,
  TaskSwitch,
  User,
} from '../api/types';

export interface DbState {
  users: Array<User & { passwordHash: string; displayName: string }>;
  profile: Profile;
  goals: Goal[];
  sessions: ActivitySession[];
  switches: TaskSwitch[];
  notifications: ActivityNotification[];
  validRefreshToken: boolean;
}

function createInitialState(): DbState {
  const users: Array<User & { passwordHash: string; displayName: string }> = [
    {
      id: 'user-demo-1',
      email: 'yashpathak086@gmail.com',
      passwordHash: 'Password123!',
      displayName: 'Yash Pathak',
    },
  ];

  const profile: Profile = {
    displayName: 'Yash Pathak',
    timezone: 'Asia/Kolkata',
    occupationType: 'professional',
    workStart: '09:00',
    workEnd: '17:00',
  };

  const goals: Goal[] = [
    {
      id: 'goal-1',
      type: 'focus_minutes',
      period: 'daily',
      targetValue: 120,
    },
    {
      id: 'goal-2',
      type: 'max_screen_minutes',
      period: 'daily',
      targetValue: 360,
    },
    {
      id: 'goal-3',
      type: 'max_context_switches',
      period: 'daily',
      targetValue: 50,
    },
  ];

  const sessions: ActivitySession[] = [];
  const switches: TaskSwitch[] = [];
  const notifications: ActivityNotification[] = [];

  const domains: Array<{ domain: string; category: SessionCategory }> = [
    { domain: 'github.com', category: 'productive' },
    { domain: 'stackoverflow.com', category: 'productive' },
    { domain: 'docs.google.com', category: 'productive' },
    { domain: 'slack.com', category: 'communication' },
    { domain: 'youtube.com', category: 'entertainment' },
    { domain: 'twitter.com', category: 'social' },
    { domain: 'reddit.com', category: 'other' },
  ];

  const apps = ['VS Code', 'Google Chrome', 'Slack', 'Terminal', 'Figma', 'Spotify'];

  const now = new Date();

  // Generate 7 days of realistic activity
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - dayOffset);

    // 6-8 sessions per day
    const sessionCount = 6 + (dayOffset % 3);
    for (let s = 0; s < sessionCount; s++) {
      const site = domains[(s + dayOffset) % domains.length];
      const startHour = 9 + s;
      const start = new Date(dayDate);
      start.setHours(startHour, (s * 15) % 60, 0, 0);

      const durationSec = 600 + ((s * 350 + dayOffset * 180) % 2400);
      const end = new Date(start.getTime() + durationSec * 1000);
      const isIdle = s % 4 === 0;

      sessions.push({
        id: `sess-${dayOffset}-${s}`,
        domain: site.domain,
        category: site.category,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        durationSec,
        idle: isIdle,
      });
    }

    // 8-12 switches per day
    const switchCount = 8 + (dayOffset % 5);
    for (let sw = 0; sw < switchCount; sw++) {
      const switchTime = new Date(dayDate);
      switchTime.setHours(9 + Math.floor(sw / 2), (sw * 12) % 60, 0, 0);
      switches.push({
        id: `sw-${dayOffset}-${sw}`,
        fromApp: apps[sw % apps.length],
        toApp: apps[(sw + 1) % apps.length],
        switchedAt: switchTime.toISOString(),
      });
    }

    // 4-6 notifications per day
    const notifCount = 4 + (dayOffset % 3);
    for (let n = 0; n < notifCount; n++) {
      const notifTime = new Date(dayDate);
      notifTime.setHours(10 + n, (n * 22) % 60, 0, 0);
      notifications.push({
        id: `notif-${dayOffset}-${n}`,
        sourceApp: apps[n % 3],
        receivedAt: notifTime.toISOString(),
      });
    }
  }

  // Sort sessions, switches, notifications descending by date
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  switches.sort((a, b) => new Date(b.switchedAt).getTime() - new Date(a.switchedAt).getTime());
  notifications.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  return {
    users,
    profile,
    goals,
    sessions,
    switches,
    notifications,
    validRefreshToken: true,
  };
}

let db = createInitialState();

export function getDb(): DbState {
  return db;
}

export function resetDb(): void {
  db = createInitialState();
}

export function getSummaryForDate(dateStr: string): ActivitySummary {
  const daySessions = db.sessions.filter((s) => s.startedAt.startsWith(dateStr));
  const daySwitches = db.switches.filter((s) => s.switchedAt.startsWith(dateStr));
  const dayNotifs = db.notifications.filter((n) => n.receivedAt.startsWith(dateStr));

  let totalScreenSec = 0;
  let activeSec = 0;
  let idleSec = 0;
  const siteDurationMap = new Map<string, number>();

  for (const s of daySessions) {
    totalScreenSec += s.durationSec;
    if (s.idle) {
      idleSec += s.durationSec;
    } else {
      activeSec += s.durationSec;
    }
    const siteKey = s.domain ?? s.appName ?? 'unknown';
    const current = siteDurationMap.get(siteKey) || 0;
    siteDurationMap.set(siteKey, current + s.durationSec);
  }

  const topSites = Array.from(siteDurationMap.entries())
    .map(([name, durationSec]) => ({ name, durationSec }))
    .sort((a, b) => b.durationSec - a.durationSec)
    .slice(0, 5);

  return {
    date: dateStr,
    totalScreenSec,
    activeSec,
    idleSec,
    switchCount: daySwitches.length,
    notificationCount: dayNotifs.length,
    topSites,
    topApps: [],
  };
}
