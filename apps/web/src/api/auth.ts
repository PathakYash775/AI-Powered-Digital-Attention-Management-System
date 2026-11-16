import { apiClient, setAccessToken, getRefreshToken, setRefreshToken } from './client';
import type { AuthResponse, LoginPayload, RefreshResponse, RegisterPayload } from './types';

export const authApi = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    setAccessToken(res.data.accessToken);
    if (res.data.refreshToken) {
      setRefreshToken(res.data.refreshToken);
    }
    return res.data;
  },

  async login(data: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    setAccessToken(res.data.accessToken);
    if (res.data.refreshToken) {
      setRefreshToken(res.data.refreshToken);
    }
    return res.data;
  },

  async refresh(): Promise<RefreshResponse> {
    const rf = getRefreshToken();
    const res = await apiClient.post<RefreshResponse>('/auth/refresh', rf ? { refreshToken: rf } : {});
    setAccessToken(res.data.accessToken);
    if (res.data.refreshToken) {
      setRefreshToken(res.data.refreshToken);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      const rf = getRefreshToken();
      await apiClient.post('/auth/logout', rf ? { refreshToken: rf } : {});
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
    }
  },
};
