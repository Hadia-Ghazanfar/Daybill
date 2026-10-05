import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken } from './client';
import { toDigits, toDisplay } from './phone';

/** Mirrors the backend user shape: phone is display format (0300-0000000). */
export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  shopName?: string;
  shopAddress?: string;
  email?: string;
  role: string;
  createdAt?: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  shopName: string;
  shopAddress: string;
  pin: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = 'daybill-user';

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  // Re-validate any stored token against /api/auth/me on boot.
  useEffect(() => {
    let alive = true;
    (async () => {
      const t = getToken();
      if (!t) {
        if (alive) {
          setUser(null);
          setTokenState(null);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await api.get<{ user: AuthUser }>('/auth/me');
        if (alive) {
          setUser(res.user);
          setTokenState(t);
          writeCachedUser(res.user);
        }
      } catch {
        if (alive) {
          setToken(null);
          writeCachedUser(null);
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const applySession = useCallback(
    (t: string, u: AuthUser) => {
      setToken(t);
      writeCachedUser(u);
      setTokenState(t);
      setUser(u);
    },
    []
  );

  const login = useCallback(
    async (phone: string, pin: string) => {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { phone: toDigits(phone), pin }
      );
      applySession(res.token, res.user);
    },
    [applySession]
  );

  const adminLogin = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/admin-login',
        { email, password }
      );
      applySession(res.token, res.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/register',
        // Backend validates the display format (0300-0000000) itself.
        { ...input, phone: toDisplay(input.phone) }
      );
      applySession(res.token, res.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    setToken(null);
    writeCachedUser(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, adminLogin, register, logout }),
    [user, token, loading, login, adminLogin, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
