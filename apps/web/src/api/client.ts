import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Capacitor } from '@capacitor/core';
import type { RefreshResponse } from './types';

const TOKEN_STORAGE_KEY = 'atn_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'atn_refresh_token';

let accessToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
let refreshToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) : null;
let refreshPromise: Promise<string> | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      // Non-JWT token (e.g. in test mock environments), treat as not expired
      return false;
    }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    // Buffer by 15 seconds to prevent mid-flight token expiration
    return Date.now() >= (payload.exp - 15) * 1000;
  } catch {
    return false;
  }
}

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('/')) {
    return import.meta.env.VITE_API_URL;
  }
  if (
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' &&
      window.location.hostname === 'localhost' &&
      !window.location.port)
  ) {
    // Android emulator loopback IP to reach the host development PC backend
    return 'http://10.0.2.2:8000/api/v1';
  }
  return '/api/v1';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const isAuthEndpoint =
    config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/register') ||
    config.url?.includes('/auth/refresh') ||
    config.url?.includes('/auth/logout');

  // Proactive refresh: if accessToken is expired and this is a protected request, refresh first
  if (accessToken && isTokenExpired(accessToken) && !isAuthEndpoint) {
    try {
      if (!refreshPromise) {
        const rf = getRefreshToken();
        refreshPromise = apiClient
          .post<RefreshResponse>('/auth/refresh', rf ? { refreshToken: rf } : {})
          .then((res) => {
            const newToken = res.data.accessToken;
            setAccessToken(newToken);
            if (res.data.refreshToken) {
              setRefreshToken(res.data.refreshToken);
            }
            return newToken;
          })
          .catch((err) => {
            setAccessToken(null);
            setRefreshToken(null);
            if (onUnauthorizedHandler) {
              onUnauthorizedHandler();
            }
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const newToken = await refreshPromise;
      accessToken = newToken;
    } catch {
      // Continue and let the request or 401 handler process normally
    }
  }

  // Set Authorization header for protected requests only
  if (accessToken && !isAuthEndpoint) {
    if (config.headers && typeof (config.headers as Record<string, unknown>).set === 'function') {
      (config.headers as { set: (k: string, v: string) => void }).set(
        'Authorization',
        `Bearer ${accessToken}`,
      );
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
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
        const rf = getRefreshToken();
        refreshPromise = apiClient
          .post<RefreshResponse>('/auth/refresh', rf ? { refreshToken: rf } : {})
          .then((res) => {
            const newToken = res.data.accessToken;
            setAccessToken(newToken);
            if (res.data.refreshToken) {
              setRefreshToken(res.data.refreshToken);
            }
            return newToken;
          })
          .catch((refreshError) => {
            setAccessToken(null);
            setRefreshToken(null);
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
      if (
        originalRequest.headers &&
        typeof (originalRequest.headers as Record<string, unknown>).set === 'function'
      ) {
        (originalRequest.headers as { set: (k: string, v: string) => void }).set(
          'Authorization',
          `Bearer ${newToken}`,
        );
      } else {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
