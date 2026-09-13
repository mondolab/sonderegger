import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './lib/api';

interface AuthState {
  usuario: string | null;
  ready: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  usuario: null,
  ready: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<{ usuario: string | null }>('/auth/me')
      .then((r) => setUsuario(r?.usuario ?? null))
      .catch(() => setUsuario(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (u: string, p: string) => {
    await api.post('/auth/login', { usuario: u, password: p });
    setUsuario(u);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUsuario(null);
  };

  return <AuthCtx.Provider value={{ usuario, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}