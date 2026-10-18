import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';

const goalSelect = {
  id: true,
  type: true,
  period: true,
  targetValue: true,
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
};
