import { prisma } from '../../lib/prisma.js';
import { activityService } from '../activity/activity.service.js';
import { predictAttention } from '../../lib/aiClient.js';
import type { SimulatePredictionInput } from './analytics.schemas.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function extractCategoryMap(byCategory: unknown): Record<string, number> {
  const catMap: Record<string, number> = {};
  if (Array.isArray(byCategory)) {
    for (const item of byCategory as Array<{ category: string; durationSec: number }>) {
      catMap[item.category] = item.durationSec;
    }
  } else if (byCategory && typeof byCategory === 'object') {
    Object.assign(catMap, byCategory as Record<string, number>);
  }
  return catMap;
}

export const analyticsService = {
  async getDaily(userId: string, targetDate?: string) {
    const date = targetDate || new Date().toISOString().slice(0, 10);
    const summary = await activityService.getSummary(userId, date);

    const totalActiveMin = Math.round(summary.activeSec / 60);
    const totalIdleMin = Math.round(summary.idleSec / 60);
    const totalScreenMin = Math.round(summary.totalScreenSec / 60);

    const catMap: Record<string, number> = {};
    if (Array.isArray(summary.byCategory)) {
      for (const item of summary.byCategory as Array<{ category: string; durationSec: number }>) {
        catMap[item.category] = item.durationSec;
      }
    } else if (summary.byCategory && typeof summary.byCategory === 'object') {
      Object.assign(catMap, summary.byCategory);
    }

    const productiveSec = catMap.productive || 0;
    const socialSec = catMap.social || 0;
    const entertainmentSec = catMap.entertainment || 0;
    const communicationSec = catMap.communication || 0;
    const otherSec = catMap.other || 0;

    const focusedMinutes = Math.round(productiveSec / 60);
    const distractedMinutes = Math.round((socialSec + entertainmentSec) / 60);
    const communicationMinutes = Math.round(communicationSec / 60);

    const productiveRatio = summary.activeSec > 0 ? productiveSec / summary.activeSec : 0;
    const switchPenalty = Math.min(25, summary.switchCount * 0.5);
    const baseScore = summary.activeSec > 0
      ? Math.round(productiveRatio * 85 + 15 - switchPenalty)
      : 100;
    const attentionScore = Math.min(100, Math.max(10, baseScore));

    return {
      date,
      attentionScore,
      totalScreenMinutes: totalScreenMin,
      activeMinutes: totalActiveMin,
      idleMinutes: totalIdleMin,
      focusedMinutes,
      distractedMinutes,
      communicationMinutes,
      switchCount: summary.switchCount,
      notificationCount: summary.notificationCount,
      byCategory: {
        productive: Math.round(productiveSec / 60),
        social: Math.round(socialSec / 60),
        entertainment: Math.round(entertainmentSec / 60),
        communication: Math.round(communicationSec / 60),
        other: Math.round(otherSec / 60),
      },
      topApps: summary.topApps,
      topSites: summary.topSites,
      hourly: summary.hourly,
    };
  },

  async getFocusScore(userId: string, targetDate?: string) {
    const daily = await this.getDaily(userId, targetDate);
    const score = daily.attentionScore;

    let rating: 'Excellent' | 'Good' | 'Moderate' | 'Distracted' = 'Moderate';
    if (daily.activeMinutes === 0) rating = 'Good';
    else if (score >= 80) rating = 'Excellent';
    else if (score >= 65) rating = 'Good';
    else if (score < 50) rating = 'Distracted';

    const productivePercent =
      daily.activeMinutes > 0
        ? Math.round((daily.focusedMinutes / daily.activeMinutes) * 100)
        : 0;

    return {
      date: daily.date,
      focusScore: score,
      rating,
      metrics: {
        productiveMinutes: daily.focusedMinutes,
        distractedMinutes: daily.distractedMinutes,
        productiveRatioPercent: productivePercent,
        switchCount: daily.switchCount,
        interruptionIndex: daily.switchCount + daily.notificationCount,
      },
      recommendation:
        daily.activeMinutes === 0
          ? 'No screen activity recorded yet today. Start your first focus session!'
          : score >= 75
            ? 'Great job maintaining deep focus today! Keep this momentum.'
            : score >= 55
              ? 'Moderate focus. Consider batching communication apps into designated check-in blocks.'
              : 'Frequent distractions detected. Try activating a 25-minute Pomodoro focus session.',
    };
  },

  async getDistractions(userId: string, targetDate?: string) {
    const daily = await this.getDaily(userId, targetDate);
    const fromDate = new Date(`${daily.date}T00:00:00.000Z`);
    const toDate = new Date(`${daily.date}T23:59:59.999Z`);

    // Fetch distracting logs for this date
    const distractingLogs = await prisma.activityLog.findMany({
      where: {
        userId,
        startedAt: { gte: fromDate, lte: toDate },
        category: { in: ['social', 'entertainment'] },
      },
      orderBy: { durationSec: 'desc' },
      take: 20,
    });

    const appMap: Record<string, { durationSec: number; count: number; category: string }> = {};
    for (const log of distractingLogs) {
      const name = log.appName || log.domain || 'Unknown';
      if (!appMap[name]) {
        appMap[name] = { durationSec: 0, count: 0, category: log.category };
      }
      appMap[name].durationSec += log.durationSec;
      appMap[name].count += 1;
    }

    const topDistractingSources = Object.entries(appMap)
      .map(([name, data]) => ({
        name,
        category: data.category,
        minutes: Math.round(data.durationSec / 60),
        events: data.count,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const totalDistractedMin = daily.distractedMinutes;
    const distractionRate =
      daily.activeMinutes > 0
        ? Number(((totalDistractedMin / daily.activeMinutes) * 100).toFixed(1))
        : 0;

    return {
      date: daily.date,
      distractionCount: distractingLogs.length,
      distractedMinutes: totalDistractedMin,
      distractionRatePercent: distractionRate,
      switchCount: daily.switchCount,
      topDistractingSources,
      riskLevel: distractionRate > 40 ? 'high' : distractionRate > 20 ? 'moderate' : 'low',
    };
  },

  async getPredictions(userId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dayUsed = DAYS[now.getDay()];

    const daily = await this.getDaily(userId, todayStr);
    const topAppName = daily.topApps[0]?.name || daily.topSites[0]?.name || 'Visual Studio Code';

    // Approximate category of current dominant app
    let dominantCategory = 'productive';
    if (daily.byCategory.social > daily.byCategory.productive) dominantCategory = 'social';
    else if (daily.byCategory.entertainment > daily.byCategory.productive) dominantCategory = 'entertainment';
    else if (daily.byCategory.communication > daily.byCategory.productive) dominantCategory = 'communication';

    const fromDate = new Date(`${todayStr}T00:00:00.000Z`);
    const toDate = new Date(`${todayStr}T23:59:59.999Z`);
    const dbEventCount = await prisma.activityLog.count({
      where: {
        userId,
        startedAt: { gte: fromDate, lte: toDate },
      },
    });

    const hoursUsed = Number((daily.activeMinutes / 60).toFixed(2)) || 0.5;
    const activeHourSlots = daily.hourly.filter((h) => h.activeSec > 0).length;
    const numberEvents = dbEventCount > 0 ? dbEventCount : Math.max(1, activeHourSlots * 15);
    const numberInteractions = daily.activeMinutes > 0 ? daily.activeMinutes * 18 : 25;
    const switches = daily.switchCount;
    const eventSpan = Math.max(10, daily.totalScreenMinutes);

    const featureVector = {
      appName: topAppName,
      category: dominantCategory,
      hoursUsed,
      dayUsed,
      numberEvents,
      numberInteractions,
      switches,
      eventSpan,
    };

    const prediction = await predictAttention(featureVector);

    return {
      timestamp: now.toISOString(),
      featuresUsed: featureVector,
      prediction: {
        attentionScore: prediction.predictedAttentionScore,
        isDistracted: prediction.isDistracted,
        distractionProbability: prediction.distractionProbability,
        riskLevel: prediction.riskLevel,
        modelEngine: prediction.source,
      },
      insights: prediction.isDistracted
        ? 'High distraction probability detected based on recent switching behavior and active category.'
        : 'User is maintaining high focus engagement with productive toolchains.',
    };
  },

  async getInsights(userId: string, targetDate?: string) {
    const daily = await this.getDaily(userId, targetDate);

    const insights: Array<{ type: 'positive' | 'warning' | 'tip'; title: string; message: string }> = [];

    if (daily.focusedMinutes >= 120) {
      insights.push({
        type: 'positive',
        title: 'Deep Work Champion',
        message: `You achieved ${daily.focusedMinutes} minutes of focused productive time today!`,
      });
    }

    if (daily.switchCount > 30) {
      insights.push({
        type: 'warning',
        title: 'High Context Switching',
        message: `Recorded ${daily.switchCount} window switches. Frequent context shifts can deplete mental energy.`,
      });
    }

    if (daily.distractedMinutes > 60) {
      insights.push({
        type: 'warning',
        title: 'Social & Media Infiltration',
        message: `You spent ${daily.distractedMinutes} minutes on non-productive platforms today.`,
      });
    }

    insights.push({
      type: 'tip',
      title: 'Optimal Focus Window',
      message: 'Morning hours (9 AM - 12 PM) typically show highest cognitive stamina with lowest switch penalties.',
    });

    return {
      date: daily.date,
      insightsCount: insights.length,
      insights,
    };
  },

  async getSummary(userId: string, targetDate?: string) {
    const daily = await this.getDaily(userId, targetDate);
    const focusScore = await this.getFocusScore(userId, targetDate);
    const distractions = await this.getDistractions(userId, targetDate);

    return {
      date: daily.date,
      focusScore: focusScore.focusScore,
      rating: focusScore.rating,
      totalScreenMinutes: daily.totalScreenMinutes,
      activeMinutes: daily.activeMinutes,
      focusedMinutes: daily.focusedMinutes,
      distractedMinutes: daily.distractedMinutes,
      distractionRatePercent: distractions.distractionRatePercent,
      switchCount: daily.switchCount,
      topDistraction: distractions.topDistractingSources[0]?.name || 'None',
      topProductive: daily.topApps[0]?.name || daily.topSites[0]?.name || 'None',
      summaryStatement: `Overall attention score of ${focusScore.focusScore}/100 with ${daily.focusedMinutes}m focused and ${distractions.distractedMinutes}m distracted screen time.`,
    };
  },

  async simulatePrediction(features: SimulatePredictionInput) {
    const prediction = await predictAttention(features);

    return {
      timestamp: new Date().toISOString(),
      featuresUsed: features,
      prediction: {
        attentionScore: prediction.predictedAttentionScore,
        isDistracted: prediction.isDistracted,
        distractionProbability: prediction.distractionProbability,
        riskLevel: prediction.riskLevel,
        modelEngine: prediction.source,
      },
      insights: prediction.isDistracted
        ? 'High distraction probability detected based on switching rate and non-productive category.'
        : 'User demonstrates high focus engagement with productive toolchains.',
    };
  },

  async getWeeklySummary(userId: string, targetDate?: string) {
    const todayStr = targetDate || new Date().toISOString().slice(0, 10);
    const todayDate = new Date(`${todayStr}T12:00:00.000Z`);

    // Determine Monday of the current week (ISO week: Monday = 1, Sunday = 7)
    const dayOfWeek = todayDate.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(todayDate);
    monday.setUTCDate(todayDate.getUTCDate() + diffToMonday);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let totalScore = 0;
    let daysWithDataCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const isToday = dateStr === todayStr;

      const summary = await activityService.getSummary(userId, dateStr);
      const activeMinutes = Math.round(summary.activeSec / 60);
      const totalScreenMinutes = Math.round(summary.totalScreenSec / 60);

      let score: number | null = null;
      let hasData = false;

      if (activeMinutes > 0) {
        hasData = true;
        const catMap = extractCategoryMap(summary.byCategory);
        const productiveSec = catMap.productive || 0;
        const productiveRatio = productiveSec / summary.activeSec;
        const switchPenalty = Math.min(25, summary.switchCount * 0.5);
        const baseScore = Math.round(productiveRatio * 85 + 15 - switchPenalty);
        score = Math.min(100, Math.max(10, baseScore));
        totalScore += score;
        daysWithDataCount++;
      }

      days.push({
        day: dayNames[i],
        date: dateStr,
        isToday,
        hasData,
        score,
        activeMinutes,
        totalScreenMinutes,
      });
    }

    const weeklyAverage = daysWithDataCount > 0 ? Math.round(totalScore / daysWithDataCount) : null;

    // Completed focus sessions for today
    const fromDate = new Date(`${todayStr}T00:00:00.000Z`);
    const toDate = new Date(`${todayStr}T23:59:59.999Z`);
    const completedSessions = await prisma.focusSession.count({
      where: {
        userId,
        startedAt: { gte: fromDate, lte: toDate },
        status: 'completed',
      },
    });

    const todayDay = days.find((d) => d.isToday) || days[0];
    const todaySummary = await activityService.getSummary(userId, todayStr);
    const todayCatMap = extractCategoryMap(todaySummary.byCategory);

    let status: 'Good Focus' | 'Moderate Focus' | 'Needs Improvement' | 'No activity recorded yet' = 'No activity recorded yet';
    if (todayDay.hasData && todayDay.score !== null) {
      if (todayDay.score >= 70) status = 'Good Focus';
      else if (todayDay.score >= 50) status = 'Moderate Focus';
      else status = 'Needs Improvement';
    }

    return {
      today: {
        date: todayStr,
        hasData: todayDay.hasData,
        focusScore: todayDay.score,
        totalScreenMinutes: Math.round(todaySummary.totalScreenSec / 60),
        activeMinutes: Math.round(todaySummary.activeSec / 60),
        distractedMinutes: Math.round(
          ((todayCatMap.social || 0) + (todayCatMap.entertainment || 0)) / 60
        ),
        switchCount: todaySummary.switchCount,
        completedFocusSessions: completedSessions,
        status,
      },
      weeklyAverage,
      daysWithDataCount,
      days,
    };
  },
};
