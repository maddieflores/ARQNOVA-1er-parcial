import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthProvider'

export function MainLayout() {
  const { user } = useAuth(); const editor = /\/projects\/[^/]+\/editor$/.test(useLocation().pathname)
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-white p-5"><nav className="mx-auto flex max-w-4xl flex-wrap gap-6"><NavLink to="/">ARQNOVA</NavLink><NavLink to="/login">Login</NavLink><NavLink to="/dashboard">Dashboard</NavLink>{user?.role.name === 'ADMINISTRADOR' && <NavLink to="/admin/users">Gestión de usuarios</NavLink>}{user?.role.name === 'ANFITRION' && <NavLink to="/projects">Proyectos</NavLink>}{user?.role.name === 'COLABORADOR' && <NavLink to="/shared-projects">Proyectos compartidos</NavLink>}</nav></header><main className={editor ? '' : 'mx-auto max-w-4xl p-6'}><Outlet/></main></div>
}
