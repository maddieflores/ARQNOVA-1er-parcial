import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getJson } from '../services/http';
import { SOCKET_URL } from '../services/config';
import type { HealthResponse } from '../types/health';
export function useServerStatus() {
  const [health, setHealth] = useState('Consultando…');
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getJson<HealthResponse>('/health', controller.signal)
      .then(data => setHealth(`${data.service}: ${data.status}`))
      .catch(() => { if (!controller.signal.aborted) setHealth('API no disponible'); });
    const socket = io(`${SOCKET_URL}/collaboration`);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    return () => { controller.abort(); socket.disconnect(); };
  }, []);
  return { health, connected };
}
