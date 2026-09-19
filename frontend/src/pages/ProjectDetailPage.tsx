import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { projectsService, type Project } from '../modules/projects/projects-service';
import { ApiError } from '../services/http';

const formatDate = (value: string) => new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    projectsService.get(id, controller.signal).then(value => { if (!controller.signal.aborted) setProject(value); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof ApiError ? failure.message : 'No se pudo consultar el proyecto.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  if (loading) return <p role="status">Cargando proyecto…</p>;
  if (error || !project) return <section><h1 className="text-2xl font-bold">Proyecto no disponible</h1><p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error ?? 'No se pudo consultar el proyecto.'}</p><Link className="mt-4 inline-block text-blue-700 underline" to="/projects">Volver a proyectos</Link></section>;
  return <>
    <Link className="text-blue-700 underline" to="/projects">← Volver a proyectos</Link>
    <h1 className="mt-4 text-2xl font-bold">{project.name}</h1>
    <dl className="mt-5 grid gap-4 rounded border bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><dt className="font-semibold">Descripción</dt><dd className="mt-1 whitespace-pre-wrap">{project.description || 'Sin descripción.'}</dd></div>
      <div><dt className="font-semibold">Propietario</dt><dd>{project.owner.name} ({project.owner.email})</dd></div>
      <div><dt className="font-semibold">Creado</dt><dd>{formatDate(project.createdAt)}</dd></div>
      <div><dt className="font-semibold">Actualizado</dt><dd>{formatDate(project.updatedAt)}</dd></div>
    </dl>
    <section className="mt-6 rounded border border-dashed p-5"><h2 className="font-semibold">Diagrama UML</h2><p className="mt-2 text-slate-600">Editor UML disponible en una fase posterior.</p></section>
  </>;
}
