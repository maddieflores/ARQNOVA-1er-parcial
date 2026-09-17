import { requestJson } from '../../services/http';
export interface Role { id: string; name: string; description: string | null; }
export interface ManagedUser { id: string; name: string; email: string; isActive: boolean; roleId: string; role: Role; createdAt: string; updatedAt: string; }
export interface UserInput { name: string; email: string; roleId: string; isActive: boolean; }
export const usersService = {
  list(search = '', signal?: AbortSignal): Promise<ManagedUser[]> { return requestJson(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, { signal }); },
  get(id: string): Promise<ManagedUser> { return requestJson(`/users/${id}`); },
  create(input: UserInput & { password: string }): Promise<ManagedUser> { return requestJson('/users', { method: 'POST', body: input }); },
  update(id: string, input: UserInput): Promise<ManagedUser> { return requestJson(`/users/${id}`, { method: 'PATCH', body: input }); },
  status(id: string, isActive: boolean): Promise<ManagedUser> { return requestJson(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }); },
  roles(signal?: AbortSignal): Promise<Role[]> { return requestJson('/roles', { signal }); },
};
