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
  plannedMin: true,
  startedAt: true,
  endedAt: true,
  status: true,
  interruptionCount: true,
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

    return prisma.focusSession.create({
      data: {
        userId,
        plannedMin: input.plannedMin,
        startedAt: new Date(),
        status: 'active',
      },
      select: focusSessionSelect,
    });
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
};
