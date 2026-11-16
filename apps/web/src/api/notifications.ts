import { apiClient } from './client';
import type { NotificationPreferences, SmartAlert } from './types';

export const notificationsApi = {
  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return res.data;
  },

  async updatePreferences(
    data: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const res = await apiClient.put<NotificationPreferences>('/notifications/preferences', data);
    return res.data;
  },

  async getAlerts(unreadOnly = false): Promise<SmartAlert[]> {
    try {
      const res = await apiClient.get<SmartAlert[]>('/notifications/alerts', {
        params: { unreadOnly },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async markAlertRead(id: string): Promise<SmartAlert> {
    const res = await apiClient.patch<SmartAlert>(`/notifications/alerts/${id}/read`);
    return res.data;
  },

  async markAllRead(): Promise<{ success: boolean }> {
    const res = await apiClient.patch<{ success: boolean }>('/notifications/alerts/read-all');
    return res.data;
  },

  async clearRead(): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>('/notifications/alerts/clear-read');
    return res.data;
  },

  async deleteAlert(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/notifications/alerts/${id}`);
    return res.data;
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
    return res.data;
  },

  async evaluateAlerts(): Promise<{ generated: number; alerts: SmartAlert[] }> {
    const res = await apiClient.post<{ generated: number; alerts: SmartAlert[] }>(
      '/notifications/evaluate',
    );
    return res.data;
  },
};

