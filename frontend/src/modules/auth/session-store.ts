const SESSION_KEY = 'arqnova.auth.token';
const listeners = new Set<(message?: string) => void>();

export const sessionStore = {
  getToken(): string | null {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  },
  saveToken(token: string): void {
    try { localStorage.setItem(SESSION_KEY, token); }
    catch { throw new Error('No se pudo guardar la sesión en este navegador.'); }
  },
  clear(message?: string, expectedToken?: string): void {
    // Un 401 de una petición anterior no debe borrar una sesión recién iniciada.
    if (expectedToken !== undefined && this.getToken() !== expectedToken) return;
    try { localStorage.removeItem(SESSION_KEY); } catch { /* El estado en memoria se limpia igualmente. */ }
    listeners.forEach(listener => listener(message));
  },
  subscribe(listener: (message?: string) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  isSessionStorageEvent(event: StorageEvent): boolean { return event.key === SESSION_KEY || event.key === null; },
};
