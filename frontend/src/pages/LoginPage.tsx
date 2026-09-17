import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthProvider';
import { ApiError } from '../services/http';

export function LoginPage() {
  const { status, sessionError, login, retry } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  if (status === 'checking') return <p role="status">Comprobando sesión…</p>;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace/>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      setPassword(''); navigate('/dashboard', { replace: true });
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'No se pudo iniciar sesión. Intenta nuevamente.');
      setPassword('');
    } finally { submitting.current = false; setBusy(false); }
  };

  return <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold text-blue-700">ARQNOVA</p>
    <h1 className="mt-2 text-2xl font-bold">Iniciar sesión</h1>
    <p className="mt-2 text-sm text-slate-600">Ingresa con tu cuenta de ARQNOVA.</p>
    {(error || sessionError) && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error || sessionError}</p>}
    {status === 'unavailable' && <button className="mt-3 underline" onClick={retry}>Reintentar comprobación de sesión</button>}
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div><label className="mb-1 block" htmlFor="email">Email</label><input className="w-full rounded border border-slate-300 p-2 focus:outline-blue-700" id="email" type="email" autoComplete="username" required maxLength={254} disabled={busy} value={email} onChange={event => setEmail(event.target.value)}/></div>
      <div><label className="mb-1 block" htmlFor="password">Contraseña</label><input className="w-full rounded border border-slate-300 p-2 focus:outline-blue-700" id="password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/></div>
      <button className="w-full rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={busy}>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</button>
      {busy && <p role="status" className="text-sm">Validando credenciales…</p>}
    </form>
  </section>;
}
