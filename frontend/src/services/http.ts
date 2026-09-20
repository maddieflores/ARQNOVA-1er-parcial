import { API_URL } from './config';
import { sessionStore } from '../modules/auth/session-store';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

interface RequestOptions { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal; authenticated?: boolean; }
export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.authenticated === false ? null : sessionStore.getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET', headers, signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, 'No se pudo contactar con la API. Intenta nuevamente.');
  }
  if (!response.ok) {
    if (response.status === 401 && token) sessionStore.clear('Sesión inválida o expirada. Inicia sesión nuevamente.', token);
    const message = response.status === 401
      ? (options.authenticated === false ? 'Credenciales inválidas.' : 'Sesión inválida o expirada.')
      : response.status === 400 ? 'Revisa los datos ingresados.' : 'Ocurrió un error. Intenta nuevamente.';
    let safeMessage = message;
    if (response.status === 403) safeMessage = 'No tienes permiso para realizar esta acción.';
    if ([400, 404, 409].includes(response.status)) {
      const body = await response.json().catch(() => null) as { message?: unknown } | null;
      const allowed = ['La propuesta entra en conflicto con el diagrama actual', 'El email ya está registrado', 'Rol inexistente', 'Usuario inexistente', 'Usuario invitado inexistente', 'Proyecto inexistente', 'Participante inexistente', 'El propietario no necesita una invitación', 'El propietario no puede ser retirado del proyecto', 'El usuario ya participa en el proyecto', 'Ya existe una invitación vigente para este usuario', 'La invitación expiró', 'La invitación ya no está pendiente', 'La invitación ya no es válida', 'Invitación inexistente', 'Token de invitación inválido', 'No se puede desactivar ni cambiar el rol del último administrador activo', 'Indica al menos un campo para actualizar'];
      if (typeof body?.message === 'string' && allowed.includes(body.message)) safeMessage = body.message;
    }
    throw new ApiError(response.status, safeMessage);
  }
  try { return await response.json() as T; }
  catch { throw new ApiError(500, 'Se recibió una respuesta inesperada. Intenta nuevamente.'); }
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { signal });
}

export async function requestMultipartJson<T>(path: string, body: FormData): Promise<T> {
  const response = await authenticatedFetch(path, { method: 'POST', body });
  try { return await response.json() as T; } catch { throw new ApiError(500, 'Se recibió una respuesta inesperada. Intenta nuevamente.'); }
}

export async function downloadAuthenticated(path: string): Promise<Blob> {
  const response = await authenticatedFetch(path, { method: 'GET' });
  return response.blob();
}

async function authenticatedFetch(path: string, init: RequestInit): Promise<Response> {
  const token = sessionStore.getToken();
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...init, headers: { Accept: 'application/xml, application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); }
  catch { throw new ApiError(0, 'No se pudo contactar con la API. Intenta nuevamente.'); }
  if (response.ok) return response;
  if (response.status === 401 && token) sessionStore.clear('Sesión inválida o expirada. Inicia sesión nuevamente.', token);
  let message = response.status === 401 ? 'Sesión inválida o expirada.' : response.status === 403 ? 'No tienes permiso para realizar esta acción.' : response.status === 409 ? 'La operación entra en conflicto con el estado actual.' : 'Revisa el archivo XMI e intenta nuevamente.';
  const body = await response.json().catch(() => null) as { message?: unknown } | null;
  const allowed = ['El archivo XMI contiene XML inválido', 'El archivo no contiene un modelo UML', 'El XMI contiene clases duplicadas', 'El XMI contiene relaciones con clases inexistentes', 'El XMI contiene relaciones duplicadas', 'El XMI contiene una multiplicidad inválida', 'El XMI contiene atributos duplicados', 'El XMI contiene métodos duplicados', 'Selecciona un archivo XMI válido', 'El archivo XMI supera el límite de 2 MB', 'El archivo debe tener extensión .xmi o .xml', 'No se puede importar mientras existen elementos en edición'];
  if (typeof body?.message === 'string' && allowed.includes(body.message)) message = body.message;
  throw new ApiError(response.status, message);
}
