import { prisma } from '../../lib/prisma.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { AppError } from '../../lib/errors.js';
import type { UpdateNotificationPreferencesInput } from './notifications.schemas.js';

function isWithinQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  if (startMin <= endMin) {
    return currentMinutes >= startMin && currentMinutes <= endMin;
  }
  // Spans midnight (e.g. 22:00 to 08:00)
  return currentMinutes >= startMin || currentMinutes <= endMin;
}

export const notificationsService = {
  async getPreferences(userId: string) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          distractionAlerts: true,
          breakReminders: true,
          focusSessionAlerts: true,
          weeklyReportAlerts: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        },
      });
    }

    return pref;
  },

  async updatePreferences(userId: string, input: UpdateNotificationPreferencesInput) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(input.distractionAlerts !== undefined && { distractionAlerts: input.distractionAlerts }),
        ...(input.breakReminders !== undefined && { breakReminders: input.breakReminders }),
        ...(input.focusSessionAlerts !== undefined && { focusSessionAlerts: input.focusSessionAlerts }),
        ...(input.weeklyReportAlerts !== undefined && { weeklyReportAlerts: input.weeklyReportAlerts }),
        ...(input.quietHoursEnabled !== undefined && { quietHoursEnabled: input.quietHoursEnabled }),
        ...(input.quietHoursStart !== undefined && { quietHoursStart: input.quietHoursStart }),
        ...(input.quietHoursEnd !== undefined && { quietHoursEnd: input.quietHoursEnd }),
      },
      create: {
        userId,
        distractionAlerts: input.distractionAlerts ?? true,
        breakReminders: input.breakReminders ?? true,
        focusSessionAlerts: input.focusSessionAlerts ?? true,
        weeklyReportAlerts: input.weeklyReportAlerts ?? true,
        quietHoursEnabled: input.quietHoursEnabled ?? false,
        quietHoursStart: input.quietHoursStart ?? '22:00',
        quietHoursEnd: input.quietHoursEnd ?? '08:00',
      },
    });
  },

  async getAlerts(userId: string, limit = 20) {
    return prisma.smartAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async markAlertRead(userId: string, id: string) {
    const alert = await prisma.smartAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new AppError(404, 'NOT_FOUND', 'Alert not found');
    }

    return prisma.smartAlert.update({
      where: { id },
      data: { read: true },
    });
  },

  async markAllRead(userId: string) {
    return prisma.smartAlert.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },

  async deleteAlert(userId: string, id: string) {
    const alert = await prisma.smartAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new AppError(404, 'NOT_FOUND', 'Alert not found');
    }

    return prisma.smartAlert.delete({
      where: { id },
    });
  },

  async getUnreadCount(userId: string) {
    const count = await prisma.smartAlert.count({
      where: { userId, read: false },
    });
    return { unreadCount: count };
  },

  async evaluateAndGenerateAlerts(userId: string) {
    const prefs = await this.getPreferences(userId);

    // Respect quiet hours
    if (prefs.quietHoursEnabled && isWithinQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
      return { generated: 0, reason: 'quiet_hours_active' };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const daily = await analyticsService.getDaily(userId, todayStr);
    const distractions = await analyticsService.getDistractions(userId, todayStr);

    const generatedAlerts = [];
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    // 1. Distraction Alert
    if (prefs.distractionAlerts && distractions.distractedMinutes >= 20) {
      const existing = await prisma.smartAlert.findFirst({
        where: {
          userId,
          type: 'distraction',
          createdAt: { gte: todayStart },
        },
      });

      if (!existing) {
        const topApp = distractions.topDistractingSources[0]?.name || 'distracting apps';
        const alert = await prisma.smartAlert.create({
          data: {
            userId,
            type: 'distraction',
            title: `Distraction Threshold Exceeded`,
            message: `You've spent ${distractions.distractedMinutes} minutes on non-work platforms today (primarily ${topApp}). Consider activating a focus block.`,
            severity: 'warning',
          },
        });
        generatedAlerts.push(alert);
      }
    }

    // 2. Break Reminder Alert
    if (prefs.breakReminders && daily.activeMinutes >= 60) {
      const existing = await prisma.smartAlert.findFirst({
        where: {
          userId,
          type: 'break_suggestion',
          createdAt: { gte: todayStart },
        },
      });

      if (!existing) {
        const alert = await prisma.smartAlert.create({
          data: {
            userId,
            type: 'break_suggestion',
            title: `Cognitive Pause Recommended`,
            message: `You have logged ${daily.activeMinutes} minutes of active screen time. Step away for 5-10 minutes to reset working memory stamina.`,
            severity: 'info',
          },
        });
        generatedAlerts.push(alert);
      }
    }

    // 3. Focus Session Alert
    if (prefs.focusSessionAlerts && daily.focusedMinutes >= 60) {
      const existing = await prisma.smartAlert.findFirst({
        where: {
          userId,
          type: 'focus_milestone',
          createdAt: { gte: todayStart },
        },
      });

      if (!existing) {
        const alert = await prisma.smartAlert.create({
          data: {
            userId,
            type: 'focus_milestone',
            title: `Deep Work Milestone!`,
            message: `Congratulations! You crossed ${daily.focusedMinutes} minutes of focused deep work today.`,
            severity: 'success',
          },
        });
        generatedAlerts.push(alert);
      }
    }

    // 4. Task Deadline Alert
    if (prefs.taskDeadlineAlerts) {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const urgentTask = await prisma.task.findFirst({
        where: {
          userId,
          status: { in: ['todo', 'in_progress'] },
          deadline: { lte: in24Hours, gte: now },
        },
        orderBy: { deadline: 'asc' },
      });

      if (urgentTask) {
        const existing = await prisma.smartAlert.findFirst({
          where: {
            userId,
            type: 'task_deadline',
            createdAt: { gte: todayStart },
          },
        });
        if (!existing) {
          const alert = await prisma.smartAlert.create({
            data: {
              userId,
              type: 'task_deadline',
              title: `Task Deadline Approaching`,
              message: `Task "${urgentTask.title}" is due soon. Consider scheduling a focus block to complete it.`,
              severity: 'warning',
            },
          });
          generatedAlerts.push(alert);
        }
      }
    }

    // 5. Recommendation Notification
    if (prefs.recommendationAlerts) {
      const pendingRec = await prisma.recommendation.findFirst({
        where: { userId, status: 'pending' },
        orderBy: { impactScore: 'desc' },
      });
      if (pendingRec) {
        const existing = await prisma.smartAlert.findFirst({
          where: {
            userId,
            type: 'recommendation_available',
            createdAt: { gte: todayStart },
          },
        });
        if (!existing) {
          const alert = await prisma.smartAlert.create({
            data: {
              userId,
              type: 'recommendation_available',
              title: `New Focus Recommendation Ready`,
              message: `AI analyzed your recent attention patterns: "${pendingRec.title}".`,
              severity: 'info',
            },
          });
          generatedAlerts.push(alert);
        }
      }
    }

    return {
      generated: generatedAlerts.length,
      alerts: generatedAlerts,
    };
  },
};

