import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { status, sessionError, retry, logout } = useAuth();
  if (status === 'checking') return <p role="status">Comprobando sesión…</p>;
  if (status === 'unavailable') return <section><p role="alert">{sessionError}</p><button className="mt-4 rounded bg-blue-700 px-4 py-2 text-white" onClick={retry}>Reintentar</button><button className="ml-4 underline" onClick={logout}>Ir al login</button></section>;
  return status === 'authenticated' ? <Outlet/> : <Navigate to="/login" replace/>;
}
