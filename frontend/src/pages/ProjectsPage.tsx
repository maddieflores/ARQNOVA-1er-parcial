import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ProjectForm } from '../modules/projects/ProjectForm';
import { projectsService, type Project, type ProjectInput } from '../modules/projects/projects-service';
import { ApiError } from '../services/http';

const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'No se pudo completar la operación.';
const formatDate = (value: string) => new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<{ project: Project | null } | null>(null);
  const actionPending = useRef(false);

  const load = async (signal?: AbortSignal) => setProjects(await projectsService.list(query, signal));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    load(controller.signal).catch(failure => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const save = async (input: ProjectInput) => {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      if (form?.project) await projectsService.update(form.project.id, input); else await projectsService.create(input);
      setForm(null); setSuccess(form?.project ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.');
      await load();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { actionPending.current = false; setBusy(false); }
  };

  const remove = async (project: Project) => {
    if (actionPending.current || !window.confirm(`¿Eliminar el proyecto ${project.name}?`)) return;
    actionPending.current = true; setBusy(true); setError(null); setSuccess(null);
    try { await projectsService.remove(project.id); setSuccess('Proyecto eliminado correctamente.'); await load(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { actionPending.current = false; setBusy(false); }
  };

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setQuery(search.trim()); };
  return <>
    <h1 className="text-2xl font-bold">Proyectos UML</h1>
    <p className="mt-2 text-slate-600">Gestiona tus proyectos de modelado.</p>
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {success && <p role="status" className="mt-4 rounded bg-green-50 p-3 text-green-800">{success}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || loading} onClick={() => { setForm({ project: null }); setError(null); setSuccess(null); }}>Crear proyecto</button>
      <form className="flex flex-wrap gap-2" onSubmit={submitSearch}><label className="sr-only" htmlFor="project-search">Buscar proyectos</label><input id="project-search" className="rounded border p-2" placeholder="Nombre del proyecto" maxLength={120} value={search} onChange={event => setSearch(event.target.value)}/><button className="rounded border px-3" disabled={busy}>Buscar</button></form>
    </div>
    {form && <ProjectForm key={form.project?.id ?? 'new'} project={form.project} busy={busy} onSave={save} onCancel={() => setForm(null)}/>} 
    {loading ? <p role="status" className="mt-5">Cargando proyectos…</p> : projects.length === 0 ? <p className="mt-5">No hay proyectos para mostrar.</p> : <ul className="mt-5 grid gap-4 sm:grid-cols-2">{projects.map(project => <li key={project.id} className="rounded border bg-white p-4">
      <h2 className="text-lg font-semibold">{project.name}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{project.description || 'Sin descripción.'}</p>
      <p className="mt-3 text-xs text-slate-500">Actualizado: {formatDate(project.updatedAt)}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link className="rounded border px-3 py-2" to={`/projects/${project.id}`}>Abrir</Link><button className="rounded border px-3 py-2" disabled={busy} onClick={() => { setForm({ project }); setError(null); setSuccess(null); }}>Editar</button><button className="rounded border border-red-300 px-3 py-2 text-red-700" disabled={busy} onClick={() => { void remove(project); }}>Eliminar</button></div>
    </li>)}</ul>}
  </>;
}
