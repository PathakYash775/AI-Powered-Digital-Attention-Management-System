import { apiClient } from './client';
import type {
  DailyBriefing,
  WeeklyAiReport,
  FindingExplanation,
  AssistantAnswer,
  ModelTransparencyInfo,
} from './types';

export const aiApi = {
  async getDailyBriefing(date?: string): Promise<DailyBriefing> {
    const res = await apiClient.get<DailyBriefing>('/ai/daily-briefing', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  async getWeeklyReport(date?: string): Promise<WeeklyAiReport> {
    const res = await apiClient.get<WeeklyAiReport>('/ai/weekly-report', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  async explainFinding(
    findingType: 'context_switch_spike' | 'focus_score_drop' | 'distraction_surge' | 'prolonged_inactivity' | 'peak_window_shift' | 'general',
    findingDetails?: string | Record<string, unknown>,
    date?: string,
  ): Promise<FindingExplanation> {
    const res = await apiClient.post<FindingExplanation>('/ai/explain', {
      findingType,
      findingDetails,
      date,
    });
    return res.data;
  },

  async askAssistant(
    question: string,
    history?: Array<{ role: 'user' | 'assistant'; text: string }>,
    date?: string,
  ): Promise<AssistantAnswer> {
    const res = await apiClient.post<AssistantAnswer>('/ai/assistant', {
      question,
      history,
      date,
    });
    return res.data;
  },

  async getModelInfo(): Promise<ModelTransparencyInfo> {
    const res = await apiClient.get<ModelTransparencyInfo>('/ai/model-info');
    return res.data;
  },
};
