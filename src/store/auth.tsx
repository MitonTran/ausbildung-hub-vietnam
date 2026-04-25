import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role, User } from '../types';

interface Ctx {
  user: User | null;
  login: (email: string, role: Role) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthCtx = createContext<Ctx>({ user: null, login: () => {}, logout: () => {}, switchRole: () => {} });

const STORAGE = 'ahv-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  });

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE, JSON.stringify(u));
    else localStorage.removeItem(STORAGE);
  };

  const login = (email: string, role: Role) => {
    const name = email.split('@')[0];
    const u: User = {
      id: 'u_' + Math.random().toString(36).slice(2, 9),
      email,
      fullName: name.charAt(0).toUpperCase() + name.slice(1),
      role,
      createdAt: new Date().toISOString(),
      plan: 'free',
    };
    persist(u);
  };

  const logout = () => persist(null);
  const switchRole = (role: Role) => user && persist({ ...user, role });

  return <AuthCtx.Provider value={{ user, login, logout, switchRole }}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
