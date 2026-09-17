import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
export function AdminRoute() {
  const { user } = useAuth();
  return user?.role.name === 'ADMINISTRADOR' ? <Outlet/> : <section><h1 className="text-2xl font-bold">Acceso no autorizado</h1><p className="mt-3">No tienes permiso para administrar usuarios.</p><Link className="mt-3 inline-block text-blue-700 underline" to="/dashboard">Volver al dashboard</Link></section>;
}
