import { apiClient } from './client';

export interface AttentionFeatures {
  appName: string;
  category: string;
  hoursUsed: number;
  dayUsed: string;
  numberEvents: number;
  numberInteractions: number;
  switches: number;
  eventSpan: number;
}

export interface PredictionPayload {
  attentionScore: number;
  isDistracted: boolean;
  distractionProbability: number;
  riskLevel: 'low' | 'moderate' | 'high';
  modelEngine: 'ml_model' | 'heuristic_engine';
}

export interface PredictionResult {
  timestamp: string;
  featuresUsed: AttentionFeatures;
  prediction: PredictionPayload;
  insights: string;
}

export interface DailyAnalytics {
  date: string;
  attentionScore: number;
  totalScreenMinutes: number;
  activeMinutes: number;
  idleMinutes: number;
  focusedMinutes: number;
  distractedMinutes: number;
  communicationMinutes: number;
  switchCount: number;
  notificationCount: number;
  byCategory: {
    productive: number;
    social: number;
    entertainment: number;
    communication: number;
    other: number;
  };
  topApps: Array<{ name: string; durationSec: number }>;
  topSites: Array<{ domain: string; durationSec: number }>;
  hourly: Array<{ hour: number; activeSec: number; idleSec: number; switchCount: number }>;
}

export interface FocusScoreMetrics {
  date: string;
  focusScore: number;
  rating: 'Excellent' | 'Good' | 'Moderate' | 'Distracted';
  metrics: {
    productiveMinutes: number;
    distractedMinutes: number;
    productiveRatioPercent: number;
    switchCount: number;
    interruptionIndex: number;
  };
  recommendation: string;
}

export interface DistractionAnalysis {
  date: string;
  distractionCount: number;
  distractedMinutes: number;
  distractionRatePercent: number;
  switchCount: number;
  topDistractingSources: Array<{
    name: string;
    category: string;
    minutes: number;
    events: number;
  }>;
  riskLevel: 'low' | 'moderate' | 'high';
}

export interface AttentionInsight {
  type: 'tip' | 'warning' | 'kudos';
  title: string;
  message: string;
}

export interface InsightsResult {
  date: string;
  insightsCount: number;
  insights: AttentionInsight[];
}

export interface AnalyticsSummary {
  date: string;
  focusScore: number;
  rating: string;
  totalScreenMinutes: number;
  activeMinutes: number;
  focusedMinutes: number;
  distractedMinutes: number;
  distractionRatePercent: number;
  switchCount: number;
  topDistraction: string;
  topProductive: string;
  summaryStatement: string;
}

export interface SimulateInput {
  appName: string;
  category: 'productive' | 'social' | 'communication' | 'entertainment' | 'other';
  hoursUsed: number;
  dayUsed: string;
  numberEvents: number;
  numberInteractions: number;
  switches: number;
  eventSpan: number;
}

export interface WeeklyDaySummary {
  day: string;
  date: string;
  isToday: boolean;
  hasData: boolean;
  score: number | null;
  activeMinutes: number;
  totalScreenMinutes: number;
}

export interface WeeklySummaryResult {
  today: {
    date: string;
    hasData: boolean;
    focusScore: number | null;
    totalScreenMinutes: number;
    activeMinutes: number;
    distractedMinutes: number;
    switchCount: number;
    completedFocusSessions: number;
    status: 'Good Focus' | 'Moderate Focus' | 'Needs Improvement' | 'No activity recorded yet';
  };
  weeklyAverage: number | null;
  daysWithDataCount: number;
  days: WeeklyDaySummary[];
}

export const analyticsApi = {
  async getDaily(date?: string): Promise<DailyAnalytics> {
    const res = await apiClient.get<DailyAnalytics>('/analytics/daily', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async getWeeklySummary(date?: string): Promise<WeeklySummaryResult> {
    const res = await apiClient.get<WeeklySummaryResult>('/analytics/weekly-summary', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async getFocusScore(date?: string): Promise<FocusScoreMetrics> {
    const res = await apiClient.get<FocusScoreMetrics>('/analytics/focus-score', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async getDistractions(date?: string): Promise<DistractionAnalysis> {
    const res = await apiClient.get<DistractionAnalysis>('/analytics/distractions', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async getPredictions(): Promise<PredictionResult> {
    const res = await apiClient.get<PredictionResult>('/analytics/predictions');
    return res.data;
  },

  async getInsights(date?: string): Promise<InsightsResult> {
    const res = await apiClient.get<InsightsResult>('/analytics/insights', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async getSummary(date?: string): Promise<AnalyticsSummary> {
    const res = await apiClient.get<AnalyticsSummary>('/analytics/summary', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  async simulate(payload: SimulateInput): Promise<PredictionResult> {
    const res = await apiClient.post<PredictionResult>('/analytics/simulate', payload);
    return res.data;
  },
};

