import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../../api/auth';
import {
  getAccessToken,
  isTokenExpired,
  setAccessToken,
  setOnUnauthorized,
  setRefreshToken,
} from '../../api/client';
import type { LoginPayload, RegisterPayload, User } from '../../api/types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getSafeRedirect(target: string | null): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

const USER_STORAGE_KEY = 'atn_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('atn_access_token');
      return Boolean(token && !isTokenExpired(token));
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    setOnUnauthorized(() => {
      if (mounted) {
        setUser(null);
        setIsAuthenticated(false);
        setAccessToken(null);
        setRefreshToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    });

    authApi
      .refresh()
      .then((res) => {
        if (mounted) {
          setIsAuthenticated(true);
          if (res?.user) {
            setUser(res.user);
            if (typeof window !== 'undefined') {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
            }
          }
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          const isAuthError = status === 401 || status === 403;
          const token = getAccessToken();
          if (!token || isTokenExpired(token) || isAuthError) {
            setAccessToken(null);
            setRefreshToken(null);
            setIsAuthenticated(false);
            setUser(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(USER_STORAGE_KEY);
            }
          }
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      setOnUnauthorized(null);
    };
  }, []);

  const login = async (data: LoginPayload): Promise<User> => {
    const res = await authApi.login(data);
    setUser(res.user);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    }
    return res.user;
  };

  const register = async (data: RegisterPayload): Promise<User> => {
    const res = await authApi.register(data);
    setUser(res.user);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    }
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  };

  const isAdmin = Boolean(user?.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
