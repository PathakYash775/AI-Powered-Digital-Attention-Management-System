import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { decodeCursor, encodeCursor } from '../../lib/pagination.js';
import type { ActivityListQuery } from './activity.schemas.js';

interface ResolvedDateRange {
  fromDate: Date;
  toDate: Date;
}

function resolveDateRange(from?: string, to?: string): ResolvedDateRange {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'from must be before or equal to to');
  }

  const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Date range exceeds maximum of 90 days');
  }

  return { fromDate, toDate };
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

    // Query real daily usage stat from PostgreSQL (no fake auto-seeding)

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
        byCategory: {},
        hourly,
      };
    }

    const topSites = Array.isArray(stat.topSites)
      ? (stat.topSites as Array<{ name: string; durationSec: number }>)
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
        domain: true,
        category: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        idle: true,
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

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
      },
      orderBy: [{ switchedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

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
      },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

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
