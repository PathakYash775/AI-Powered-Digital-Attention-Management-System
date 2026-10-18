import { apiClient, setAccessToken } from './client';
import type { AuthResponse, LoginPayload, RefreshResponse, RegisterPayload } from './types';

export const authApi = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async login(data: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async refresh(): Promise<RefreshResponse> {
    const res = await apiClient.post<RefreshResponse>('/auth/refresh');
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
};
