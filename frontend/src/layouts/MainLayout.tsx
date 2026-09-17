import { NavLink, Outlet } from 'react-router-dom';
export function MainLayout() {
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-white p-5"><nav className="mx-auto flex max-w-4xl gap-6"><NavLink to="/">ARQNOVA</NavLink><NavLink to="/login">Login</NavLink><NavLink to="/dashboard">Dashboard</NavLink></nav></header><main className="mx-auto max-w-4xl p-6"><Outlet/></main></div>;
}
