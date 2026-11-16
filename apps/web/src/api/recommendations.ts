import { apiClient } from './client';
import type {
  BehavioralAnalysisResponse,
  Recommendation,
  RecommendationStatus,
} from './types';

export const recommendationsApi = {
  async getBehavioralAnalysis(): Promise<BehavioralAnalysisResponse> {
    const res = await apiClient.get<BehavioralAnalysisResponse>('/recommendations/behavioral-analysis');
    return res.data;
  },

  async listRecommendations(params?: {
    category?: string;
    status?: string;
  }): Promise<Recommendation[]> {
    const res = await apiClient.get<Recommendation[]>('/recommendations', { params });
    return res.data;
  },

  async generateRecommendations(): Promise<{ count: number; recommendations: Recommendation[] }> {
    const res = await apiClient.post<{ count: number; recommendations: Recommendation[] }>(
      '/recommendations/generate',
    );
    return res.data;
  },

  async updateStatus(id: string, status: RecommendationStatus): Promise<Recommendation> {
    const res = await apiClient.patch<Recommendation>(`/recommendations/${id}/status`, { status });
    return res.data;
  },
};

