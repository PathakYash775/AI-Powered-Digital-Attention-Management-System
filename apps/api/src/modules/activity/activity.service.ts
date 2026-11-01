import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { decodeCursor, encodeCursor } from '../../lib/pagination.js';
import { recomputeUsageForDates } from '../usage/rollup.js';
import type { ActivityListQuery } from './activity.schemas.js';

interface ResolvedDateRange {
  fromDate: Date;
  toDate: Date;
}

function parseDateBoundary(dateStr: string, isEnd = false): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T${isEnd ? '23:59:59.999Z' : '00:00:00.000Z'}`);
  }
  return new Date(dateStr);
}

function resolveDateRange(from?: string, to?: string): ResolvedDateRange {
  const toDate = to ? parseDateBoundary(to, true) : new Date();
  const fromDate = from ? parseDateBoundary(from, false) : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'from must be before or equal to to');
  }

  const maxRangeMs = 91 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Date range exceeds maximum of 90 days');
  }

  return { fromDate, toDate };
}

const DOMAIN_APP_MAP: Record<string, string> = {
  localhost: 'Digital Attention Management',
  '127.0.0.1': 'Digital Attention API Server',
  'github.com': 'GitHub',
  github: 'GitHub',
  'claude.ai': 'Claude AI',
  claude: 'Claude AI',
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'openai.com': 'ChatGPT',
  chatgpt: 'ChatGPT',
  'slack.com': 'Slack',
  slack: 'Slack',
  'youtube.com': 'YouTube',
  youtube: 'YouTube',
  'linkedin.com': 'LinkedIn',
  linkedin: 'LinkedIn',
  'notion.so': 'Notion',
  notion: 'Notion',
  'takeuforward.org': 'TakeUForward',
  takeuforward: 'TakeUForward',
  'stackoverflow.com': 'Stack Overflow',
  stackoverflow: 'Stack Overflow',
  'discord.com': 'Discord',
  discord: 'Discord',
  'figma.com': 'Figma',
  figma: 'Figma',
  'linear.app': 'Linear',
  linear: 'Linear',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  twitter: 'X (Twitter)',
  'reddit.com': 'Reddit',
  reddit: 'Reddit',
  'spotify.com': 'Spotify',
  spotify: 'Spotify',
  'netflix.com': 'Netflix',
  netflix: 'Netflix',
  'google.com': 'Google Search',
  'mail.google.com': 'Gmail',
  gmail: 'Gmail',
  'meet.google.com': 'Google Meet',
  'calendar.google.com': 'Google Calendar',
  'google calendar': 'Google Calendar',
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'teams.microsoft.com': 'Microsoft Teams',
  'microsoft teams': 'Microsoft Teams',
  'zoom.us': 'Zoom',
  zoom: 'Zoom',
  'gitlab.com': 'GitLab',
  gitlab: 'GitLab',
  'bitbucket.org': 'Bitbucket',
  bitbucket: 'Bitbucket',
  'leetcode.com': 'LeetCode',
  leetcode: 'LeetCode',
  'codechef.com': 'CodeChef',
  codechef: 'CodeChef',
  'codeforces.com': 'Codeforces',
  codeforces: 'Codeforces',
  'medium.com': 'Medium',
  medium: 'Medium',
  'dev.to': 'DEV Community',
  'amazon.com': 'Amazon',
  'amazon.in': 'Amazon',
  amazon: 'Amazon',
  'whatsapp.com': 'WhatsApp',
  'web.whatsapp.com': 'WhatsApp Web',
  whatsapp: 'WhatsApp',
  'telegram.org': 'Telegram',
  'web.telegram.org': 'Telegram Web',
  telegram: 'Telegram',
  'gemini.google.com': 'Google Gemini',
  vscode: 'Visual Studio Code',
  'vs code': 'Visual Studio Code',
  code: 'Visual Studio Code',
  'google chrome': 'Google Chrome',
  chrome: 'Google Chrome',
};

function resolveAppName(domain: string | null): string {
  if (!domain) return 'Unknown Application';
  let clean = domain.trim();
  if (!clean) return 'Unknown Application';

  const parenMatch = clean.match(/^([^(]+)\s*\((.+)\)$/);
  if (parenMatch) {
    clean = parenMatch[1].trim();
  }

  const d = clean.toLowerCase();
  if (DOMAIN_APP_MAP[d]) return DOMAIN_APP_MAP[d];
  for (const [key, name] of Object.entries(DOMAIN_APP_MAP)) {
    if (d === key || d.endsWith('.' + key)) return name;
  }
  if (d.includes('localhost') || d.includes('127.0.0.1')) {
    return 'Digital Attention Management';
  }
  const parts = d.split('.');
  const mainPart = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  if (mainPart) {
    return mainPart
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return clean;
}

export const activityService = {
  async getSummary(userId: string, date: string) {
    let stat = await prisma.dailyUsageStat.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    if (!stat) {
      // Recompute on-demand from raw activity logs in case rollup hasn't executed
      try {
        await recomputeUsageForDates(userId, [date]);
        stat = await prisma.dailyUsageStat.findUnique({
          where: {
            userId_date: {
              userId,
              date,
            },
          },
        });
      } catch {
        // Continue if rollup fails
      }
    }

    const hourlyRecords = await prisma.hourlyUsagePattern.findMany({
      where: { userId, date },
      orderBy: { hour: 'asc' },
    });

    const hourlyMap = new Map(hourlyRecords.map((h) => [h.hour, h]));
    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const h = hourlyMap.get(hour);
      return {
        hour,
        activeSec: h?.activeSec ?? 0,
        idleSec: h?.idleSec ?? 0,
        totalScreenSec: (h?.activeSec ?? 0) + (h?.idleSec ?? 0),
        switchCount: h?.switchCount ?? 0,
        notificationCount: h?.notificationCount ?? 0,
      };
    });

    if (!stat) {
      return {
        date,
        totalScreenSec: 0,
        activeSec: 0,
        idleSec: 0,
        switchCount: 0,
        notificationCount: 0,
        topSites: [],
        topApps: [],
        byCategory: {},
        hourly,
      };
    }

    const topSites = Array.isArray(stat.topSites)
      ? (stat.topSites as Array<{ name: string; durationSec: number }>)
      : [];

    const topApps = Array.isArray((stat as any).topApps)
      ? ((stat as any).topApps as Array<{ name: string; durationSec: number }>)
      : [];

    const byCategory =
      stat.byCategory && typeof stat.byCategory === 'object' ? stat.byCategory : {};

    return {
      date: stat.date,
      totalScreenSec: stat.totalScreenSec,
      activeSec: stat.activeSec,
      idleSec: stat.idleSec,
      switchCount: stat.switchCount,
      notificationCount: stat.notificationCount,
      topSites,
      topApps,
      byCategory,
      hourly,
    };
  },

  async getReport(userId: string, date: string) {
    const summary = await this.getSummary(userId, date);

    const patterns = await prisma.hourlyUsagePattern.findMany({
      where: { userId, date },
      orderBy: { hour: 'asc' },
    });

    const [yStr, mStr, dStr] = date.split('-');
    const y = parseInt(yStr ?? '2026', 10);
    const m = parseInt(mStr ?? '10', 10) - 1;
    const d = parseInt(dStr ?? '12', 10);
    const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(y, m, d, 23, 59, 59));

    const [activities, focusSessions, goals] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          userId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        select: { category: true, durationSec: true, idle: true },
      }),
      prisma.focusSession.findMany({
        where: {
          userId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.goal.findMany({
        where: { userId },
      }),
    ]);

    const categoryBreakdown: Record<string, number> = {
      productive: 0,
      communication: 0,
      entertainment: 0,
      social: 0,
      other: 0,
    };

    for (const act of activities) {
      if (!act.idle) {
        const cat = String(act.category);
        categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + act.durationSec;
      }
    }

    const totalFromActivities = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);
    if (totalFromActivities === 0 && summary.byCategory) {
      if (Array.isArray(summary.byCategory)) {
        for (const item of summary.byCategory as Array<{ category: string; durationSec: number }>) {
          const cat = String(item.category).toLowerCase();
          categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + item.durationSec;
        }
      } else if (typeof summary.byCategory === 'object') {
        for (const [k, v] of Object.entries(summary.byCategory)) {
          const cat = k.toLowerCase();
          categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + (Number(v) || 0);
        }
      }
    }

    return {
      summary,
      hourlyPatterns: patterns.map((p: any) => ({
        hour: p.hour,
        activeSec: p.activeSec,
        idleSec: p.idleSec,
        switchCount: p.switchCount,
        notificationCount: p.notificationCount,
      })),
      categoryBreakdown,
      focusSessions,
      goals,
    };
  },

  async getSessions(userId: string, query: ActivityListQuery) {
    const { fromDate, toDate } = resolveDateRange(query.from, query.to);
    const limit = query.limit;

    let cursorCondition: { OR: Array<Record<string, unknown>> } | undefined;
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      cursorCondition = {
        OR: [
          { startedAt: { lt: new Date(decoded.time) } },
          { startedAt: new Date(decoded.time), id: { lt: decoded.id } },
        ],
      };
    }

    const rows = await prisma.activityLog.findMany({
      where: {
        userId,
        startedAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(cursorCondition && cursorCondition),
      },
      select: {
        id: true,
        source: true,
        domain: true,
        appName: true,
        category: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        idle: true,
        device: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const rawItems = hasMore ? rows.slice(0, limit) : rows;
    const items = rawItems.map((r) => {
      const resolvedName = r.appName || (r.domain ? resolveAppName(r.domain) : 'Unknown');
      return {
        id: r.id,
        source: r.source,
        domain: r.domain,
        appName: r.appName,
        siteName: resolvedName,
        device: r.device,
        category: r.category,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationSec: r.durationSec,
        idle: r.idle,
      };
    });

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = items[items.length - 1];
      if (last) {
        nextCursor = encodeCursor({
          time: last.startedAt.toISOString(),
          id: last.id,
        });
      }
    }

    return { items, nextCursor };
  },

  async getSwitches(userId: string, query: ActivityListQuery) {
    const { fromDate, toDate } = resolveDateRange(query.from, query.to);
    const limit = query.limit;

    let cursorCondition: { OR: Array<Record<string, unknown>> } | undefined;
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      cursorCondition = {
        OR: [
          { switchedAt: { lt: new Date(decoded.time) } },
          { switchedAt: new Date(decoded.time), id: { lt: decoded.id } },
        ],
      };
    }

    const rows = await prisma.contextSwitch.findMany({
      where: {
        userId,
        switchedAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(cursorCondition && cursorCondition),
      },
      select: {
        id: true,
        fromApp: true,
        toApp: true,
        switchedAt: true,
        device: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
      orderBy: [{ switchedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const rawItems = hasMore ? rows.slice(0, limit) : rows;
    const items = rawItems.map((r) => {
      const fromAppName = resolveAppName(r.fromApp);
      const toAppName = resolveAppName(r.toApp);
      return {
        id: r.id,
        fromApp: r.fromApp,
        toApp: r.toApp,
        fromAppName,
        toAppName,
        device: r.device,
        switchedAt: r.switchedAt,
      };
    });

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = items[items.length - 1];
      if (last) {
        nextCursor = encodeCursor({
          time: last.switchedAt.toISOString(),
          id: last.id,
        });
      }
    }

    return { items, nextCursor };
  },

  async getNotifications(userId: string, query: ActivityListQuery) {
    const { fromDate, toDate } = resolveDateRange(query.from, query.to);
    const limit = query.limit;

    let cursorCondition: { OR: Array<Record<string, unknown>> } | undefined;
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      cursorCondition = {
        OR: [
          { receivedAt: { lt: new Date(decoded.time) } },
          { receivedAt: new Date(decoded.time), id: { lt: decoded.id } },
        ],
      };
    }

    const rows = await prisma.notificationEvent.findMany({
      where: {
        userId,
        receivedAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(cursorCondition && cursorCondition),
      },
      select: {
        id: true,
        sourceApp: true,
        receivedAt: true,
        device: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const rawItems = hasMore ? rows.slice(0, limit) : rows;
    const items = rawItems.map((r) => {
      const sourceAppName = resolveAppName(r.sourceApp);
      return {
        id: r.id,
        sourceApp: r.sourceApp,
        sourceAppName,
        device: r.device,
        receivedAt: r.receivedAt,
      };
    });

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = items[items.length - 1];
      if (last) {
        nextCursor = encodeCursor({
          time: last.receivedAt.toISOString(),
          id: last.id,
        });
      }
    }

    return { items, nextCursor };
  },
};
