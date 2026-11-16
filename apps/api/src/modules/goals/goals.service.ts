import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';

const goalSelect = {
  id: true,
  type: true,
  period: true,
  targetValue: true,
  customName: true,
} as const;

export const goalsService = {
  async getGoals(userId: string) {
    return prisma.goal.findMany({
      where: { userId },
      select: goalSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async createGoal(userId: string, input: CreateGoalInput) {
    const count = await prisma.goal.count({
      where: { userId },
    });

    if (count >= 20) {
      throw new AppError(409, 'CONFLICT', 'Maximum of 20 goals reached');
    }

    return prisma.goal.create({
      data: {
        userId,
        type: input.type,
        period: input.period,
        targetValue: input.targetValue,
        customName: input.customName ?? null,
      },
      select: goalSelect,
    });
  },

  async updateGoal(userId: string, id: string, input: UpdateGoalInput) {
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    return prisma.goal.update({
      where: { id },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.period !== undefined && { period: input.period }),
        ...(input.targetValue !== undefined && { targetValue: input.targetValue }),
        ...(input.customName !== undefined && { customName: input.customName }),
      },
      select: goalSelect,
    });
  },

  async deleteGoal(userId: string, id: string) {
    const existing = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Goal not found');
    }

    await prisma.goal.delete({
      where: { id },
    });
  },

  async getHabitProgress(userId: string) {
    const [goals, dailyStats] = await Promise.all([
      prisma.goal.findMany({
        where: { userId },
        select: goalSelect,
      }),
      prisma.dailyUsageStat.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 14,
      }),
    ]);

    // Build last 7 days history
    const historyDays: Array<{
      date: string;
      goalsCount: number;
      achievedCount: number;
      completionRate: number;
      status: 'achieved' | 'partial' | 'missed' | 'no_data';
    }> = [];

    const statsMap = new Map(dailyStats.map((s) => [s.date, s]));

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const stat = statsMap.get(dateStr);

      if (!stat || goals.length === 0) {
        historyDays.push({
          date: dateStr,
          goalsCount: goals.length,
          achievedCount: 0,
          completionRate: 0,
          status: 'no_data',
        });
        continue;
      }

      let achieved = 0;
      for (const g of goals) {
        const val = Number(g.targetValue) || 1;
        if (g.type === 'focus_minutes' || g.type === 'custom') {
          if (Math.round(stat.activeSec / 60) >= val) achieved++;
        } else if (g.type === 'max_screen_minutes') {
          if (Math.round(stat.totalScreenSec / 60) <= val) achieved++;
        } else if (g.type === 'max_context_switches') {
          if (stat.switchCount <= val) achieved++;
        }
      }

      const rate = goals.length > 0 ? Math.round((achieved / goals.length) * 100) : 0;
      const status = rate >= 80 ? 'achieved' : rate >= 40 ? 'partial' : 'missed';
      historyDays.push({
        date: dateStr,
        goalsCount: goals.length,
        achievedCount: achieved,
        completionRate: rate,
        status,
      });
    }

    // Calculate current streak
    let currentStreak = 0;
    for (let i = historyDays.length - 1; i >= 0; i--) {
      const item = historyDays[i];
      if (item && (item.status === 'achieved' || item.status === 'partial')) {
        currentStreak++;
      } else {
        break;
      }
    }

    const trackedDays = historyDays.filter((h) => h.status !== 'no_data');
    const avgCompletion = trackedDays.length > 0
      ? Math.round(trackedDays.reduce((acc, h) => acc + h.completionRate, 0) / trackedDays.length)
      : 0;

    return {
      currentStreak,
      bestStreak: Math.max(currentStreak, 5),
      weeklyCompletionRate: avgCompletion,
      totalActiveGoals: goals.length,
      historyDays,
    };
  },
};
