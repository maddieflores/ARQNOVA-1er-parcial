import { Link, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function UmlEditorRoute() {
  const { user } = useAuth()
  return user && ['ANFITRION', 'COLABORADOR'].includes(user.role.name) ? <Outlet/> : <section>
    <h1 className="text-2xl font-bold">Acceso no autorizado</h1>
    <p className="mt-3">El editor está disponible para anfitriones y colaboradores autorizados.</p>
    <Link className="mt-3 inline-block text-blue-700 underline" to="/dashboard">Volver al dashboard</Link>
  </section>
}
