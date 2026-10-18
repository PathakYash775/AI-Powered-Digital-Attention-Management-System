import { apiClient } from './client';
import type { FocusSessionItem, PaginatedResult } from './types';

export interface StartFocusSessionPayload {
  plannedMin: number;
}

export interface StopFocusSessionPayload {
  status: 'completed' | 'abandoned';
}

export const focusApi = {
  async getActiveSession(): Promise<FocusSessionItem | null> {
    const res = await apiClient.get<FocusSessionItem | null>('/focus-sessions/active');
    return res.data;
  },

  async startSession(payload: StartFocusSessionPayload): Promise<FocusSessionItem> {
    const res = await apiClient.post<FocusSessionItem>('/focus-sessions/start', payload);
    return res.data;
  },

  async stopSession(id: string, payload: StopFocusSessionPayload): Promise<FocusSessionItem> {
    const res = await apiClient.post<FocusSessionItem>(`/focus-sessions/${id}/stop`, payload);
    return res.data;
  },

  async listSessions(limit = 20): Promise<PaginatedResult<FocusSessionItem>> {
    const res = await apiClient.get<PaginatedResult<FocusSessionItem>>('/focus-sessions', {
      params: { limit },
    });
    return res.data;
  },
};
