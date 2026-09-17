import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../../services/http';
import { authService } from './auth-service';
import { sessionStore } from './session-store';
import type { AuthUser, LoginInput } from './types';

type Status = 'checking' | 'authenticated' | 'anonymous' | 'unavailable';
interface AuthContextValue {
  user: AuthUser | null; status: Status; sessionError: string | null;
  login(input: LoginInput): Promise<void>; logout(): void; retry(): void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const generation = useRef(0);

  const recover = useCallback(async (signal?: AbortSignal) => {
    const current = ++generation.current;
    setStatus('checking'); setUser(null); setSessionError(null);
    try {
      const restored = await authService.recoverSession(signal);
      if (current !== generation.current || signal?.aborted) return;
      setUser(restored); setStatus(restored ? 'authenticated' : 'anonymous');
    } catch (error) {
      if (current !== generation.current || signal?.aborted) return;
      setSessionError(error instanceof ApiError ? error.message : 'No se pudo comprobar la sesión.');
      setStatus(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = sessionStore.subscribe(message => {
      generation.current++; setUser(null); setStatus('anonymous'); setSessionError(message ?? null);
    });
    const storageChanged = (event: StorageEvent) => {
      if (sessionStore.isSessionStorageEvent(event)) void recover();
    };
    window.addEventListener('storage', storageChanged);
    void recover(controller.signal);
    return () => { generation.current++; controller.abort(); unsubscribe(); window.removeEventListener('storage', storageChanged); };
  }, [recover]);

  const login = async (input: LoginInput) => {
    const current = ++generation.current;
    const result = await authService.login(input);
    if (current !== generation.current) return;
    authService.saveSession(result.accessToken);
    setUser(result.user); setStatus('authenticated'); setSessionError(null);
  };

  return <AuthContext.Provider value={{ user, status, sessionError, login, logout: () => authService.logout(), retry: () => { void recover(); } }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth requiere AuthProvider');
  return auth;
}
