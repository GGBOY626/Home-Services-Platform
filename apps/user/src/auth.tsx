import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, API_BASE, AuthResponse } from '@home-services/shared';

const STORAGE_KEY = 'user_app_auth';

function loadStored(): { accessToken: string; refreshToken: string; role: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStored(data: AuthResponse | null) {
  if (!data) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      role: data.role,
    })
  );
}

interface AuthContextValue {
  token: string | null;
  refreshToken: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (data: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(loadStored);

  const setAuth = useCallback((data: AuthResponse) => {
    saveStored(data);
    setStored({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      role: data.role,
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuth(data);
  }, [setAuth]);

  const logout = useCallback(() => {
    saveStored(null);
    setStored(null);
  }, []);

  const value: AuthContextValue = {
    token: stored?.accessToken ?? null,
    refreshToken: stored?.refreshToken ?? null,
    role: stored?.role ?? null,
    login,
    logout,
    setAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
