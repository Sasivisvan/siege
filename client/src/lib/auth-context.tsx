// ============================================
// SIEGE Client — Authentication Context
// ============================================
// React context for auth state management.
// Stores JWT token + user info, provides
// login/register/logout functions.
// ============================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/api';

// --- Types ---

interface User {
  id: string;
  email: string;
  name: string;
  role: 'candidate' | 'recruiter' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Storage Keys ---

const TOKEN_KEY = 'siege_token';
const USER_KEY = 'siege_user';

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Validate shape before trusting localStorage data
        if (
          typeof parsed === 'object' && parsed !== null &&
          typeof parsed.id === 'string' &&
          typeof parsed.email === 'string' &&
          typeof parsed.name === 'string' &&
          ['candidate', 'recruiter', 'admin'].includes(parsed.role)
        ) {
          setToken(savedToken);
          setUser(parsed as User);
        } else {
          // Corrupted data — clear it
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        // Malformed JSON — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  // --- Login ---

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{
      success: boolean;
      data: { token: string; user: User };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(TOKEN_KEY, res.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  // --- Register ---

  const register = useCallback(
    async (email: string, password: string, name: string, role?: string) => {
      const res = await apiFetch<{
        success: boolean;
        data: { token: string; user: User };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role: role || 'candidate' }),
      });

      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    },
    []
  );

  // --- Logout ---

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook ---

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
