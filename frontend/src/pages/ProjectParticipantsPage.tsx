import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { participantsService, type Invitation, type Participant } from '../modules/participants/participants-service';
import { projectsService, type Project } from '../modules/projects/projects-service';
import { ApiError } from '../services/http';

const message = (error: unknown) => error instanceof ApiError ? error.message : 'No se pudo completar la operación.';
const date = (value: string) => new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function ProjectParticipantsPage() {
  const { id = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null); const [participants, setParticipants] = useState<Participant[]>([]); const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState(''); const [invitationLink, setInvitationLink] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  const pending = useRef(false);
  const load = async (signal?: AbortSignal) => {
    const [currentProject, members, invites] = await Promise.all([projectsService.get(id, signal), participantsService.list(id, signal), participantsService.invitations(id, signal)]);
    setProject(currentProject); setParticipants(members); setInvitations(invites);
  };
  useEffect(() => { const controller = new AbortController(); load(controller.signal).catch(failure => { if (!controller.signal.aborted) setError(message(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [id]);
  const invite = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current) return; pending.current = true; setBusy(true); setError(null); setSuccess(null); setInvitationLink('');
    try { const created = await participantsService.invite(id, email.trim().toLowerCase()); setEmail(''); setInvitationLink(`${window.location.origin}/invitations/${created.token}`); setSuccess('Invitación creada correctamente.'); await load(); }
    catch (failure) { setError(message(failure)); } finally { pending.current = false; setBusy(false); }
  };
  const remove = async (participant: Participant) => {
    if (pending.current || !window.confirm(`¿Retirar a ${participant.user.name}?`)) return; pending.current = true; setBusy(true); setError(null); setSuccess(null);
    try { await participantsService.remove(id, participant.userId); setSuccess('Participante retirado correctamente.'); await load(); }
    catch (failure) { setError(message(failure)); } finally { pending.current = false; setBusy(false); }
  };
  if (loading) return <p role="status">Cargando participantes…</p>;
  return <>
    <Link className="text-blue-700 underline" to={`/projects/${id}`}>← Volver al proyecto</Link><h1 className="mt-4 text-2xl font-bold">Participantes de {project?.name ?? 'proyecto'}</h1>
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}{success && <p role="status" className="mt-4 rounded bg-green-50 p-3 text-green-800">{success}</p>}
    <section className="mt-5 rounded border bg-white p-4"><h2 className="text-xl font-semibold">Invitar usuario registrado</h2><form className="mt-3 flex flex-wrap gap-3" onSubmit={invite}><div className="min-w-64 flex-1"><label htmlFor="invite-email">Email</label><input id="invite-email" type="email" required maxLength={254} className="mt-1 w-full rounded border p-2" value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></div><button className="self-end rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? 'Enviando…' : 'Crear invitación'}</button></form>
      {invitationLink && <div className="mt-4 rounded bg-blue-50 p-3"><p className="font-medium">Enlace generado</p><p className="mt-1 text-sm">Compártelo de forma segura con el usuario invitado. No volverá a mostrarse.</p><input aria-label="Enlace de invitación" className="mt-2 w-full rounded border bg-white p-2" readOnly value={invitationLink}/></div>}
    </section>
    <section className="mt-6"><h2 className="text-xl font-semibold">Participantes actuales</h2>{participants.length === 0 ? <p className="mt-3">Aún no hay participantes.</p> : <ul className="mt-3 grid gap-3">{participants.map(member => <li key={member.id} className="rounded border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{member.user.name}</h3><p>{member.user.email}</p><p className="text-sm text-slate-600">{member.user.role.name} · Desde {date(member.joinedAt)}</p></div><button className="rounded border border-red-300 px-3 py-2 text-red-700" disabled={busy} onClick={() => void remove(member)}>Retirar</button></div></li>)}</ul>}</section>
    <section className="mt-6"><h2 className="text-xl font-semibold">Invitaciones</h2>{invitations.length === 0 ? <p className="mt-3">No hay invitaciones.</p> : <ul className="mt-3 grid gap-3">{invitations.map(invitation => <li key={invitation.id} className="rounded border bg-white p-4"><h3 className="font-semibold">{invitation.invitedUser.name}</h3><p>{invitation.invitedUser.email}</p><p className="text-sm text-slate-600">{invitation.status} · Expira {date(invitation.expiresAt)}</p></li>)}</ul>}</section>
  </>;
}
