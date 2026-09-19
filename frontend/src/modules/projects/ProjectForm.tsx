import { useRef, useState, type FormEvent } from 'react';
import type { Project, ProjectInput } from './projects-service';

interface Props { project: Project | null; busy: boolean; onSave(input: ProjectInput): Promise<void>; onCancel(): void; }

export function ProjectForm({ project, busy, onSave, onCancel }: Props) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const submitting = useRef(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !name.trim()) return;
    submitting.current = true;
    try { await onSave({ name: name.trim(), description: description.trim() }); }
    finally { submitting.current = false; }
  };
  const inputStyle = 'mt-1 w-full rounded border border-slate-300 p-2';
  return <section className="mt-5 rounded border bg-white p-4">
    <h2 className="text-xl font-semibold">{project ? 'Editar proyecto' : 'Crear proyecto'}</h2>
    <form className="mt-4 grid gap-4" onSubmit={submit}>
      <div><label htmlFor="project-name">Nombre</label><input id="project-name" className={inputStyle} required maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={busy}/></div>
      <div><label htmlFor="project-description">Descripción</label><textarea id="project-description" className={inputStyle} rows={4} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} disabled={busy}/></div>
      <div className="flex gap-3"><button className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || !name.trim()} type="submit">{busy ? 'Guardando…' : 'Guardar proyecto'}</button><button className="rounded border px-4 py-2" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
    </form>
  </section>;
}
