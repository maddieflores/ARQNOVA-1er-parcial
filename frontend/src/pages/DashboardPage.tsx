import { useNavigate } from 'react-router-dom';
import { ServerStatus } from '../components/ServerStatus';
import { useAuth } from '../modules/auth/AuthProvider';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return <><h1 className="text-2xl font-bold">Dashboard</h1><section className="mt-4 space-y-2"><p>Bienvenido, {user.name}</p><p>Email: {user.email}</p><p>Rol: {user.role.name}</p><button className="mt-2 rounded bg-slate-800 px-4 py-2 text-white" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Cerrar sesión</button></section><ServerStatus/></>;
}
