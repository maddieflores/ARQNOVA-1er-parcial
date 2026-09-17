import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../services/http';
import { useAuth } from '../modules/auth/AuthProvider';
import { authService } from '../modules/auth/auth-service';
import { UserForm } from '../modules/users/UserForm';
import { usersService, type ManagedUser, type Role, type UserInput } from '../modules/users/users-service';
export function AdminUsersPage() {
  const { user: currentUser, retry } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<{ user: ManagedUser | null } | null>(null);
  const actionPending = useRef(false);
  const message = (failure: unknown) => failure instanceof ApiError ? failure.message : 'No se pudo completar la operación.';
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null);
    Promise.all([usersService.list(query, controller.signal), usersService.roles(controller.signal)])
      .then(([list, availableRoles]) => { if (!controller.signal.aborted) { setUsers(list); setRoles(availableRoles); } })
      .catch(failure => { if (!controller.signal.aborted) setError(message(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const refresh = async () => { setUsers(await usersService.list(query)); };
  const save = async (input: UserInput, password?: string) => {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const updated = form?.user ? await usersService.update(form.user.id, input) : await usersService.create({ ...input, password: password ?? '' });
      setForm(null); setSuccess('Usuario guardado correctamente.');
      if (updated.id === currentUser?.id) { await authService.getUser(); retry(); } else await refresh();
    } catch (failure) { setError(message(failure)); }
    finally { actionPending.current = false; setBusy(false); }
  };
  const status = async (target: ManagedUser) => {
    if (actionPending.current || (target.isActive && !window.confirm(`¿Desactivar a ${target.name}?`))) return;
    actionPending.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      await usersService.status(target.id, !target.isActive);
      setSuccess(target.isActive ? 'Usuario desactivado.' : 'Usuario activado.');
      if (target.id === currentUser?.id) { await authService.getUser(); retry(); } else await refresh();
    } catch (failure) { setError(message(failure)); }
    finally { actionPending.current = false; setBusy(false); }
  };
  const searchUsers = (event: FormEvent) => { event.preventDefault(); setQuery(search.trim()); };
  return <><h1 className="text-2xl font-bold">Gestión de usuarios</h1>
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {success && <p role="status" className="mt-4 rounded bg-green-50 p-3 text-green-800">{success}</p>}
    <div className="mt-4 flex flex-wrap gap-3"><button className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || loading || roles.length === 0} onClick={() => { setForm({ user: null }); setError(null); setSuccess(null); }}>Crear usuario</button><form className="flex flex-wrap gap-2" onSubmit={searchUsers}><label className="sr-only" htmlFor="search">Buscar usuarios</label><input id="search" className="rounded border p-2" placeholder="Nombre o email" maxLength={100} value={search} onChange={event => setSearch(event.target.value)}/><button className="rounded border px-3" disabled={busy}>Buscar</button></form></div>
    {form && <UserForm key={form.user?.id ?? 'new'} user={form.user} roles={roles} busy={busy} onSave={save} onCancel={() => setForm(null)}/>}
    {loading ? <p role="status" className="mt-5">Cargando usuarios…</p> : users.length === 0 ? <p className="mt-5">No hay usuarios para mostrar.</p> : <ul className="mt-5 grid gap-3">{users.map(target => <li key={target.id} className="rounded border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold">{target.name}</h2><p className="break-all">{target.email}</p><p className="text-sm text-slate-600">{target.role.name} · {target.isActive ? 'Activo' : 'Inactivo'}</p></div><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={busy} onClick={() => { setForm({ user: target }); setError(null); setSuccess(null); }}>Editar</button><button className="rounded border px-3 py-2" disabled={busy} onClick={() => { void status(target); }}>{target.isActive ? 'Desactivar' : 'Activar'}</button></div></div></li>)}</ul>}
  </>;
}
