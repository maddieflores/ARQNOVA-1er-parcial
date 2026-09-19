import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { participantsService, type Invitation } from '../modules/participants/participants-service';
import { ApiError } from '../services/http';

const message = (error: unknown) => error instanceof ApiError ? error.message : 'No se pudo procesar la invitación.';

export function InvitationPage() {
  const { token = '' } = useParams(); const [invitation, setInvitation] = useState<Invitation | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [accepted, setAccepted] = useState(false);
  useEffect(() => { const controller = new AbortController(); participantsService.getInvitation(token, controller.signal).then(value => { if (!controller.signal.aborted) setInvitation(value); }).catch(failure => { if (!controller.signal.aborted) setError(message(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [token]);
  const accept = async () => { if (busy) return; setBusy(true); setError(null); try { await participantsService.accept(token); setAccepted(true); } catch (failure) { setError(message(failure)); } finally { setBusy(false); } };
  if (loading) return <p role="status">Validando invitación…</p>;
  if (accepted) return <section><h1 className="text-2xl font-bold">Invitación aceptada</h1><p className="mt-3">Ya formas parte del proyecto.</p><Link className="mt-4 inline-block text-blue-700 underline" to="/shared-projects">Ver proyectos compartidos</Link></section>;
  if (error || !invitation) return <section><h1 className="text-2xl font-bold">Invitación no disponible</h1><p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error ?? 'La invitación no es válida.'}</p></section>;
  return <section><h1 className="text-2xl font-bold">Invitación a proyecto</h1><div className="mt-5 rounded border bg-white p-5"><h2 className="text-xl font-semibold">{invitation.project.name}</h2><p className="mt-2">{invitation.project.description || 'Sin descripción.'}</p><p className="mt-3 text-sm text-slate-600">Anfitrión: {invitation.project.owner.name} ({invitation.project.owner.email})</p><button className="mt-5 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy} onClick={() => void accept()}>{busy ? 'Aceptando…' : 'Aceptar invitación'}</button></div></section>;
}
