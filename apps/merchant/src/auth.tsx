import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, AuthResponse } from '@home-services/shared';

const KEY = 'merchant_app_auth';
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function save(data: AuthResponse | null) {
  if (!data) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken, role: data.role }));
}

const AuthContext = createContext<{
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(load);
  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    save(data);
    setStored({ accessToken: data.accessToken, refreshToken: data.refreshToken, role: data.role });
  }, []);
  const logout = useCallback(() => { save(null); setStored(null); }, []);
  return <AuthContext.Provider value={{ token: stored?.accessToken ?? null, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
