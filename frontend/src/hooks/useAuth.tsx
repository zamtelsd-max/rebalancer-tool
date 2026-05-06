import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export interface AuthUser { id: string; username: string; name: string; role: string; rebalancerId?: string | null }

interface AuthCtx {
  user: AuthUser | null; token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean; isLoading: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('rb_token');
    const u = localStorage.getItem('rb_user');
    if (t && u) { try { setToken(t); setUser(JSON.parse(u)); } catch {} }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('rb_token', t);
    localStorage.setItem('rb_user', JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('rb_token'); localStorage.removeItem('rb_user');
    setToken(null); setUser(null);
  };

  return <Ctx.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
