import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { decodeCursor, encodeCursor } from '../../lib/pagination.js';
import type {
  ListFocusSessionsQuery,
  StartFocusSessionInput,
  StopFocusSessionInput,
} from './focus.schemas.js';

const focusSessionSelect = {
  id: true,
  userId: true,
  taskId: true,
  plannedMin: true,
  startedAt: true,
  endedAt: true,
  status: true,
  interruptionCount: true,
  task: {
    select: {
      id: true,
      title: true,
      category: true,
      priority: true,
    },
  },
} as const;

async function checkAndAbandonStaleSessions(userId: string): Promise<void> {
  const activeSessions = await prisma.focusSession.findMany({
    where: { userId, status: 'active' },
  });

  const now = Date.now();
  for (const session of activeSessions) {
    const expireTime = session.startedAt.getTime() + (session.plannedMin + 30) * 60 * 1000;
    if (now > expireTime) {
      const endedAt = new Date(expireTime);
      const [switches, notifs] = await Promise.all([
        prisma.contextSwitch.count({
          where: {
            userId,
            switchedAt: { gte: session.startedAt, lte: endedAt },
          },
        }),
        prisma.notificationEvent.count({
          where: {
            userId,
            receivedAt: { gte: session.startedAt, lte: endedAt },
          },
        }),
      ]);

      await prisma.focusSession.update({
        where: { id: session.id },
        data: {
          status: 'abandoned',
          endedAt,
          interruptionCount: switches + notifs,
        },
      });
    }
  }
}

export const focusService = {
  async startSession(userId: string, input: StartFocusSessionInput) {
    await checkAndAbandonStaleSessions(userId);

    const active = await prisma.focusSession.findFirst({
      where: { userId, status: 'active' },
    });

    if (active) {
      throw new AppError(409, 'CONFLICT', 'An active focus session is already in progress');
    }

    const session = await prisma.focusSession.create({
      data: {
        userId,
        taskId: input.taskId || null,
        plannedMin: input.plannedMin,
        startedAt: new Date(),
        status: 'active',
      },
      select: focusSessionSelect,
    });

    if (input.taskId) {
      await prisma.task.update({
        where: { id: input.taskId },
        data: { status: 'in_progress' },
      }).catch(() => {});
    }

    return session;
  },

  async stopSession(userId: string, id: string, input: StopFocusSessionInput) {
    const session = await prisma.focusSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw new AppError(404, 'NOT_FOUND', 'Focus session not found');
    }

    if (session.status !== 'active') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Focus session is already stopped');
    }

    const endedAt = new Date();

    const [switches, notifs] = await Promise.all([
      prisma.contextSwitch.count({
        where: {
          userId,
          switchedAt: { gte: session.startedAt, lte: endedAt },
        },
      }),
      prisma.notificationEvent.count({
        where: {
          userId,
          receivedAt: { gte: session.startedAt, lte: endedAt },
        },
      }),
    ]);

    const interruptionCount = switches + notifs;

    return prisma.focusSession.update({
      where: { id },
      data: {
        status: input.status,
        endedAt,
        interruptionCount,
      },
      select: focusSessionSelect,
    });
  },

  async getActiveSession(userId: string) {
    await checkAndAbandonStaleSessions(userId);

    return prisma.focusSession.findFirst({
      where: { userId, status: 'active' },
      select: focusSessionSelect,
    });
  },

  async listSessions(userId: string, query: ListFocusSessionsQuery) {
    await checkAndAbandonStaleSessions(userId);

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

    const rows = await prisma.focusSession.findMany({
      where: {
        userId,
        ...(cursorCondition && cursorCondition),
      },
      select: focusSessionSelect,
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

  async getSmartPlan(userId: string) {
    await checkAndAbandonStaleSessions(userId);

    const [recentSessions, patterns, goals, activeToday] = await Promise.all([
      prisma.focusSession.findMany({
        where: { userId, status: 'completed' },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.hourlyUsagePattern.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 48,
      }),
      prisma.goal.findMany({
        where: { userId },
      }),
      prisma.activityLog.aggregate({
        where: {
          userId,
          startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          idle: false,
        },
        _sum: { durationSec: true },
      }),
    ]);

    // 1. Calculate Optimal Session Duration
    let optimalDuration = 25;
    if (recentSessions.length >= 3) {
      const avgPlanned = Math.round(recentSessions.reduce((acc, s) => acc + s.plannedMin, 0) / recentSessions.length);
      const lowInterruptionCount = recentSessions.filter((s) => s.interruptionCount <= 1).length;
      if (lowInterruptionCount >= 2 && avgPlanned >= 25) {
        optimalDuration = 45;
      } else if (lowInterruptionCount >= 4 && avgPlanned >= 45) {
        optimalDuration = 60;
      } else {
        optimalDuration = 25;
      }
    }

    // 2. Break Scheduling Suggestion
    const completedToday = recentSessions.filter(
      (s) => s.startedAt >= new Date(new Date().setHours(0, 0, 0, 0)),
    ).length;
    const breakDuration = optimalDuration >= 45 ? 10 : 5;
    const isLongBreakDue = completedToday > 0 && completedToday % 4 === 0;
    const breakSuggestion = {
      recommendedMin: isLongBreakDue ? 15 : breakDuration,
      isLongBreak: isLongBreakDue,
      reason: isLongBreakDue
        ? `You completed ${completedToday} focus blocks! Take a restorative 15-minute break away from screens.`
        : `A ${breakDuration}-minute break after your ${optimalDuration}m session maintains continuous cognitive stamina.`,
    };

    // 3. High Focus Time Identification from Hourly Patterns
    const hourScores: Record<number, { activeSec: number; switches: number; count: number }> = {};
    for (const p of patterns) {
      if (!hourScores[p.hour]) {
        hourScores[p.hour] = { activeSec: 0, switches: 0, count: 0 };
      }
      hourScores[p.hour].activeSec += p.activeSec;
      hourScores[p.hour].switches += p.switchCount;
      hourScores[p.hour].count += 1;
    }

    const windows = Object.entries(hourScores)
      .map(([hourStr, data]) => {
        const hour = Number(hourStr);
        const avgActive = data.count > 0 ? data.activeSec / data.count : 0;
        const avgSwitches = data.count > 0 ? data.switches / data.count : 0;
        const efficiency = avgActive / (avgSwitches + 1);
        return { hour, efficiency, avgActive };
      })
      .filter((w) => w.avgActive > 300)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 2);

    const pad = (n: number) => String(n).padStart(2, '0');
    const highFocusWindows = windows.length > 0
      ? windows.map((w) => ({
          start: `${pad(w.hour)}:00`,
          end: `${pad(Math.min(23, w.hour + 2))}:00`,
          label: w.hour < 12 ? 'Morning Deep Flow' : w.hour < 17 ? 'Afternoon Focus' : 'Evening Block',
          confidenceScore: Math.min(96, Math.max(70, Math.round(w.efficiency * 0.1) + 65)),
        }))
      : [
          { start: '09:00', end: '11:30', label: 'Morning Deep Flow', confidenceScore: 88 },
          { start: '14:30', end: '16:30', label: 'Afternoon Synthesis', confidenceScore: 78 },
        ];

    // 4. Task Prioritization Assistance
    const activeSecToday = activeToday._sum.durationSec || 0;
    const activeMinToday = Math.round(activeSecToday / 60);

    const taskPriorities = goals.map((g) => {
      const targetVal = Number(g.targetValue) || 1;
      let completedPercent = 0;
      if (g.type === 'focus_minutes' || g.type === 'custom') {
        completedPercent = Math.min(100, Math.round((activeMinToday / targetVal) * 100));
      }
      const priorityLevel = completedPercent < 50 ? 'high' : completedPercent < 90 ? 'medium' : 'done';
      const goalTitle = g.customName || (g.type === 'focus_minutes' ? 'Deep Work Minutes' : g.type);
      return {
        goalId: g.id,
        title: goalTitle,
        priority: priorityLevel,
        suggestedBlockMin: optimalDuration,
        completedPercent,
      };
    });

    return {
      optimalDuration,
      breakSuggestion,
      highFocusWindows,
      taskPriorities,
      sessionsCompletedToday: completedToday,
    };
  },
};
