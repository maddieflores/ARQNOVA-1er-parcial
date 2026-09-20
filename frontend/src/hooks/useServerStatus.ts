import { useEffect, useState } from 'react';
import { getJson } from '../services/http';
import type { HealthResponse } from '../types/health';
import { collaborationService } from '../modules/collaboration/collaboration-service';
import { sessionStore } from '../modules/auth/session-store';
export function useServerStatus() {
  const [health, setHealth] = useState('Consultando…');
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getJson<HealthResponse>('/health', controller.signal)
      .then(data => setHealth(`${data.service}: ${data.status}`))
      .catch(() => { if (!controller.signal.aborted) setHealth('API no disponible'); });
    const unsubscribe = collaborationService.onStatus(setConnected); const token = sessionStore.getToken(); if (token) collaborationService.connect(token);
    return () => { controller.abort(); unsubscribe(); };
  }, []);
  return { health, connected };
}
