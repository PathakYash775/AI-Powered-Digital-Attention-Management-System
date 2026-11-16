import { apiClient } from './client';
import type {
  AdminOverview,
  AdminUsersResponse,
  AdminUserItem,
  AdminUserDetails,
  DomainCategoryItem,
  AdminAuditLogsResponse,
} from './types';

export const adminApi = {
  async getOverview(): Promise<AdminOverview> {
    const res = await apiClient.get<AdminOverview>('/admin/overview');
    return res.data;
  },

  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<AdminUsersResponse> {
    const res = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
    return res.data;
  },

  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    const res = await apiClient.get<AdminUserDetails>(`/admin/users/${userId}`);
    return res.data;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<AdminUserItem> {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserItem> {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${userId}/status`, { isActive });
    return res.data;
  },

  async getCategories(params?: {
    search?: string;
    kind?: string;
    category?: string;
  }): Promise<DomainCategoryItem[]> {
    const res = await apiClient.get<DomainCategoryItem[]>('/admin/categories', { params });
    return res.data;
  },

  async createCategory(data: {
    kind: 'domain' | 'app';
    pattern: string;
    category: string;
  }): Promise<DomainCategoryItem> {
    const res = await apiClient.post<DomainCategoryItem>('/admin/categories', data);
    return res.data;
  },

  async updateCategory(
    id: string,
    data: {
      kind?: 'domain' | 'app';
      pattern?: string;
      category?: string;
    },
  ): Promise<DomainCategoryItem> {
    const res = await apiClient.patch<DomainCategoryItem>(`/admin/categories/${id}`, data);
    return res.data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/admin/categories/${id}`);
    return res.data;
  },

  async getAuditLogs(): Promise<AdminAuditLogsResponse> {
    const res = await apiClient.get<AdminAuditLogsResponse>('/admin/audit-logs');
    return res.data;
  },
};

