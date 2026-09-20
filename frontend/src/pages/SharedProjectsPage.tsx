import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { participantsService, type SharedProject } from '../modules/participants/participants-service'
import { ApiError } from '../services/http'

const date = (value: string) => new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value))

export function SharedProjectsPage() {
  const [memberships, setMemberships] = useState<SharedProject[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { const controller = new AbortController(); participantsService.shared(controller.signal).then(value => { if (!controller.signal.aborted) setMemberships(value) }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof ApiError ? failure.message : 'No se pudieron consultar los proyectos compartidos.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [])
  return <><h1 className="text-2xl font-bold">Proyectos compartidos</h1><p className="mt-2 text-slate-600">Proyectos en los que participas como colaborador.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}{loading ? <p role="status" className="mt-5">Cargando proyectos…</p> : memberships.length === 0 ? <p className="mt-5">No tienes proyectos compartidos.</p> : <ul className="mt-5 grid gap-4 sm:grid-cols-2">{memberships.map(({ id, joinedAt, project }) => <li key={id} className="rounded border bg-white p-4"><h2 className="text-lg font-semibold">{project.name}</h2><p className="mt-2">{project.description || 'Sin descripción.'}</p><p className="mt-3 text-sm text-slate-600">Anfitrión: {project.owner.name}</p><p className="text-sm text-slate-600">Miembro desde {date(joinedAt)}</p><Link className="mt-3 inline-block rounded bg-blue-700 px-3 py-2 text-sm text-white" to={`/projects/${project.id}/editor`}>Abrir editor UML</Link></li>)}</ul>}</>
}
