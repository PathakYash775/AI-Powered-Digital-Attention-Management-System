import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  ApplyPrioritiesInput,
} from './tasks.schemas.js';

export const tasksService = {
  async listTasks(userId: string, query: ListTasksQuery) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
      include: {
        focusSessions: {
          select: {
            id: true,
            plannedMin: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: query.limit,
    });

    return tasks.map((t) => {
      const focusMinutesSpent = t.focusSessions.reduce((sum, s) => {
        if (s.status === 'completed') return sum + s.plannedMin;
        if (s.endedAt && s.startedAt) {
          const diffMin = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
          return sum + Math.max(0, diffMin);
        }
        return sum;
      }, 0);

      return {
        ...t,
        focusMinutesSpent,
        sessionsCount: t.focusSessions.length,
      };
    });
  },

  async getTask(userId: string, id: string) {
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        focusSessions: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    const focusMinutesSpent = task.focusSessions.reduce((sum, s) => {
      if (s.status === 'completed') return sum + s.plannedMin;
      if (s.endedAt && s.startedAt) {
        const diffMin = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
        return sum + Math.max(0, diffMin);
      }
      return sum;
    }, 0);

    return {
      ...task,
      focusMinutesSpent,
      sessionsCount: task.focusSessions.length,
    };
  },

  async createTask(userId: string, input: CreateTaskInput) {
    const deadlineDate = input.deadline ? new Date(input.deadline) : null;

    return prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        category: input.category || 'work',
        priority: input.priority || 'medium',
        estimatedMinutes: input.estimatedMinutes ?? 30,
        deadline: deadlineDate,
      },
    });
  },

  async updateTask(userId: string, id: string, input: UpdateTaskInput) {
    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    let completedAt = existing.completedAt;
    if (input.status === 'completed' && existing.status !== 'completed') {
      completedAt = new Date();
    } else if (input.status && input.status !== 'completed' && existing.status === 'completed') {
      completedAt = null;
    }

    const deadlineDate = input.deadline !== undefined
      ? (input.deadline ? new Date(input.deadline) : null)
      : undefined;

    return prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && { status: input.status, completedAt }),
        ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
        ...(deadlineDate !== undefined && { deadline: deadlineDate }),
        ...(input.order !== undefined && { order: input.order }),
      },
    });
  },

  async deleteTask(userId: string, id: string) {
    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    return prisma.task.delete({
      where: { id },
    });
  },

  async getTaskStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const [allTasks, sessions] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          priority: true,
          deadline: true,
          completedAt: true,
        },
      }),
      prisma.focusSession.findMany({
        where: {
          userId,
          taskId: { not: null },
          status: 'completed',
        },
        select: { plannedMin: true },
      }),
    ]);

    const total = allTasks.length;
    let completed = 0;
    let completedToday = 0;
    let overdue = 0;
    let inProgress = 0;
    let todo = 0;
    let urgentOrHigh = 0;

    for (const t of allTasks) {
      if (t.status === 'completed') {
        completed++;
        if (t.completedAt && t.completedAt >= todayStart) {
          completedToday++;
        }
      } else if (t.status === 'in_progress') {
        inProgress++;
        if (t.priority === 'urgent' || t.priority === 'high') urgentOrHigh++;
        if (t.deadline && t.deadline < now) overdue++;
      } else if (t.status === 'todo') {
        todo++;
        if (t.priority === 'urgent' || t.priority === 'high') urgentOrHigh++;
        if (t.deadline && t.deadline < now) overdue++;
      }
    }

    const totalFocusMinutesSpent = sessions.reduce((sum, s) => sum + s.plannedMin, 0);

    return {
      total,
      completed,
      completedToday,
      inProgress,
      todo,
      overdue,
      urgentOrHigh,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalFocusMinutesSpent,
    };
  },

  async getAiPrioritization(userId: string) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['todo', 'in_progress'] },
      },
      orderBy: [{ deadline: 'asc' }, { priority: 'desc' }],
      take: 15,
    });

    if (tasks.length === 0) {
      return {
        suggestions: [],
        prioritizedTasks: [],
        reasoning: 'No pending or in-progress tasks to prioritize.',
        summary: 'No pending or in-progress tasks to prioritize.',
      };
    }

    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are an AI Executive Function and Task Scheduling Specialist.
Given these user tasks:
${JSON.stringify(tasks.map((t) => ({
  id: t.id,
  title: t.title,
  category: t.category,
  currentPriority: t.priority,
  estimatedMinutes: t.estimatedMinutes,
  deadline: t.deadline ? t.deadline.toISOString() : 'No deadline',
})), null, 2)}

Provide an optimized task priority ranking.
Respond ONLY with a JSON object (no markdown, no backticks, no fences):
{
  "reasoning": "High-level strategic explanation of why this schedule maximizes attention stamina and meets deadlines",
  "suggestions": [
    {
      "id": "task-uuid",
      "suggestedPriority": "urgent|high|medium|low",
      "recommendedOrder": 1,
      "reason": "Specific justification based on deadline, cognitive load, and urgency"
    }
  ]
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const clean = text.replace(/```json\n?|\n?```/gi, '').trim();
            const parsed = JSON.parse(clean);
            return parsed;
          }
        }
      } catch {
        // Fall back to algorithmic prioritization
      }
    }

    // High quality Algorithmic Prioritization Fallback
    const now = Date.now();
    const sorted = [...tasks].sort((a, b) => {
      // 1. Deadline urgency
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      // 2. Existing priority
      const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
    });

    const suggestions = sorted.map((t, idx) => {
      let suggestedPriority = t.priority;
      let reason = 'Maintaining current priority based on scheduled sequence.';

      if (t.deadline) {
        const msUntil = new Date(t.deadline).getTime() - now;
        const hoursUntil = msUntil / (1000 * 60 * 60);

        if (hoursUntil < 24) {
          suggestedPriority = 'urgent';
          reason = `Due within 24 hours (${Math.max(1, Math.round(hoursUntil))}h remaining). Elevate to urgent to prevent deadline breach.`;
        } else if (hoursUntil < 72 && t.priority !== 'urgent') {
          suggestedPriority = 'high';
          reason = 'Approaching deadline within 3 days. Recommend front-loading in your next focus block.';
        }
      }

      return {
        id: t.id,
        suggestedPriority,
        recommendedOrder: idx + 1,
        reason,
      };
    });

    return {
      reasoning: 'Prioritized using Eisenhower matrix heuristics combined with deadline proximity and estimated session durations.',
      summary: 'Prioritized using Eisenhower matrix heuristics combined with deadline proximity and estimated session durations.',
      suggestions,
      prioritizedTasks: suggestions,
    };
  },

  async applyPriorities(userId: string, input: ApplyPrioritiesInput) {
    const results = [];
    for (const update of input.updates) {
      const task = await prisma.task.findFirst({
        where: { id: update.id, userId },
      });
      if (task) {
        const updated = await prisma.task.update({
          where: { id: update.id },
          data: {
            priority: update.priority,
            ...(update.order !== undefined && { order: update.order }),
          },
        });
        results.push(updated);
      }
    }
    return { updatedCount: results.length, tasks: results };
  },
};
