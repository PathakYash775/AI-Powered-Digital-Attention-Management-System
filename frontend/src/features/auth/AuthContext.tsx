import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../../api/auth';
import { setOnUnauthorized } from '../../api/client';
import type { LoginPayload, RegisterPayload, User } from '../../api/types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getSafeRedirect(target: string | null): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    setOnUnauthorized(() => {
      if (mounted) {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    authApi
      .refresh()
      .then(() => {
        if (mounted) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
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

  const login = async (data: LoginPayload) => {
    const res = await authApi.login(data);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const register = async (data: RegisterPayload) => {
    const res = await authApi.register(data);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
