import { apiClient } from './client';
import type {
  ActivityNotification,
  ActivityReport,
  ActivitySession,
  ActivitySummary,
  PaginatedResult,
  PaginationParams,
  TaskSwitch,
} from './types';

export const activityApi = {
  async getSummary(date: string): Promise<ActivitySummary> {
    const res = await apiClient.get<ActivitySummary>('/activity/summary', {
      params: { date },
    });
    return res.data;
  },

  async getReport(date: string): Promise<ActivityReport> {
    const res = await apiClient.get<ActivityReport>('/activity/report', {
      params: { date },
    });
    return res.data;
  },


  async getSessions(params: PaginationParams): Promise<PaginatedResult<ActivitySession>> {
    const res = await apiClient.get<PaginatedResult<ActivitySession>>('/activity/sessions', {
      params,
    });
    return res.data;
  },

  async getSwitches(params: PaginationParams): Promise<PaginatedResult<TaskSwitch>> {
    const res = await apiClient.get<PaginatedResult<TaskSwitch>>('/activity/switches', {
      params,
    });
    return res.data;
  },

  async getNotifications(params: PaginationParams): Promise<PaginatedResult<ActivityNotification>> {
    const res = await apiClient.get<PaginatedResult<ActivityNotification>>(
      '/activity/notifications',
      {
        params,
      },
    );
    return res.data;
  },
};
