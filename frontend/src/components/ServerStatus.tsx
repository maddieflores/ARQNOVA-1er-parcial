import { useServerStatus } from '../hooks/useServerStatus';
export function ServerStatus() {
  const { health, connected } = useServerStatus();
  return <section className="mt-6 rounded border border-slate-200 bg-white p-4" aria-live="polite"><p>Backend: {health}</p><p>Servidor realtime: {connected ? 'conectado' : 'desconectado'}</p></section>;
}
