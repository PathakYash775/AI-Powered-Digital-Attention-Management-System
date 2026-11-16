import { prisma } from '../../lib/prisma.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { geminiService, type TelemetryContext } from '../../lib/gemini.service.js';
import { AppError } from '../../lib/errors.js';
import type { RecommendationCategory, RecommendationStatus } from '@prisma/client';

export const recommendationsService = {
  async getTelemetryContext(userId: string, targetDate?: string): Promise<TelemetryContext> {
    const date = targetDate || new Date().toISOString().slice(0, 10);
    const daily = await analyticsService.getDaily(userId, date);
    const focusScore = await analyticsService.getFocusScore(userId, date);
    const distractions = await analyticsService.getDistractions(userId, date);
    const activeGoals = await prisma.goal.findMany({
      where: { userId },
      select: { type: true, targetValue: true, customName: true },
    });

    return {
      date,
      focusScore: focusScore.focusScore,
      rating: focusScore.rating,
      totalScreenMinutes: daily.totalScreenMinutes,
      activeMinutes: daily.activeMinutes,
      focusedMinutes: daily.focusedMinutes,
      distractedMinutes: daily.distractedMinutes,
      switchCount: daily.switchCount,
      notificationCount: daily.notificationCount,
      topDistractingSources: distractions.topDistractingSources,
      topApps: daily.topApps,
      topSites: daily.topSites,
      hourly: daily.hourly,
      activeGoals,
    };
  },

  async getBehavioralAnalysis(userId: string, targetDate?: string) {
    const ctx = await this.getTelemetryContext(userId, targetDate);
    const analysis = await geminiService.generateBehavioralAnalysis(ctx);

    // Sync generated recommendations into database if no active recommendations exist for today
    const existingRecs = await prisma.recommendation.findMany({
      where: {
        userId,
        status: { in: ['pending', 'accepted'] },
      },
    });

    const recsToSave = (analysis.recommendations || []).slice(0, 4);
    if (existingRecs.length === 0 && recsToSave.length > 0) {
      for (const rec of recsToSave) {
        await prisma.recommendation.create({
          data: {
            userId,
            category: rec.category as RecommendationCategory,
            title: rec.title,
            description: rec.description,
            reason: rec.reason,
            actionType: rec.actionType,
            actionPayload: rec.actionPayload ? (rec.actionPayload as any) : undefined,
            impactScore: rec.impactScore,
            status: 'pending',
          },
        });
      }
    }

    const peakLabel =
      typeof analysis.peakFocusWindow === 'object' && analysis.peakFocusWindow !== null
        ? analysis.peakFocusWindow.label ||
          `${analysis.peakFocusWindow.startHour}:00 - ${analysis.peakFocusWindow.endHour}:00`
        : String(analysis.peakFocusWindow || '09:00 - 11:30 (Morning Deep Flow)');

    return {
      date: ctx.date,
      ...analysis,
      provider: analysis.generatedBy.includes('gemini') ? 'gemini' : 'algorithmic_engine',
      distractionRootCause: analysis.rootCause,
      peakFocusWindow: peakLabel,
      peakFocusWindowDetails: analysis.peakFocusWindow,
    };
  },

  async listRecommendations(userId: string, status?: RecommendationStatus) {
    let recommendations = await prisma.recommendation.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ impactScore: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    // If none exist yet, automatically generate recommendations from real telemetry
    if (recommendations.length === 0) {
      await this.getBehavioralAnalysis(userId);
      recommendations = await prisma.recommendation.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
        },
        orderBy: [{ impactScore: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      });
    }

    return recommendations.slice(0, 5);
  },

  async generateRecommendations(userId: string, targetDate?: string) {
    const ctx = await this.getTelemetryContext(userId, targetDate);
    const analysis = await geminiService.generateBehavioralAnalysis(ctx);

    const createdRecs = [];
    const recsToProcess = (analysis.recommendations || []).slice(0, 4);
    for (const rec of recsToProcess) {
      // Check if duplicate already exists in pending/accepted
      const existing = await prisma.recommendation.findFirst({
        where: {
          userId,
          title: rec.title,
          status: { in: ['pending', 'accepted'] },
        },
      });

      if (!existing) {
        const created = await prisma.recommendation.create({
          data: {
            userId,
            category: rec.category as RecommendationCategory,
            title: rec.title,
            description: rec.description,
            reason: rec.reason,
            actionType: rec.actionType,
            actionPayload: rec.actionPayload ? (rec.actionPayload as any) : undefined,
            impactScore: rec.impactScore,
            status: 'pending',
          },
        });
        createdRecs.push(created);
      } else {
        createdRecs.push(existing);
      }
    }

    return {
      behavioralAnalysis: analysis,
      recommendations: createdRecs.slice(0, 5),
    };
  },

  async updateStatus(userId: string, id: string, newStatus: RecommendationStatus) {
    const rec = await prisma.recommendation.findFirst({
      where: { id, userId },
    });

    if (!rec) {
      throw new AppError(404, 'NOT_FOUND', 'Recommendation not found or access denied');
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: newStatus,
        dismissedAt: newStatus === 'dismissed' ? new Date() : undefined,
        completedAt: newStatus === 'completed' ? new Date() : undefined,
      },
    });

    return updated;
  },
};
