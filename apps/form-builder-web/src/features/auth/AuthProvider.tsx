import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { queryClient } from '../../shared/api/queryClient.js';
import * as authApi from './authApi.js';
import type { LoginInput, RegisterInput, User } from './authTypes.js';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentUser = useQuery({ queryFn: authApi.getCurrentUser, queryKey: AUTH_QUERY_KEY });

  const login = useCallback(async (input: LoginInput) => {
    const user = await authApi.login(input);
    queryClient.setQueryData(AUTH_QUERY_KEY, user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await authApi.register(input);
    queryClient.setQueryData(AUTH_QUERY_KEY, user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.removeQueries({ queryKey: ['forms'] });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: currentUser.data !== null && currentUser.data !== undefined,
    isLoading: currentUser.isLoading,
    login,
    logout,
    register,
    user: currentUser.data ?? null,
  }), [currentUser.data, currentUser.isLoading, login, logout, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
