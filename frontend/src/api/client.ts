import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { RefreshResponse } from './types';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest || !error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout');

    if (isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post<RefreshResponse>('/auth/refresh')
          .then((res) => {
            const newToken = res.data.accessToken;
            setAccessToken(newToken);
            return newToken;
          })
          .catch((refreshError) => {
            setAccessToken(null);
            if (onUnauthorizedHandler) {
              onUnauthorizedHandler();
            } else if (typeof window !== 'undefined') {
              window.location.replace('/login');
            }
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
