import { requestJson } from '../../services/http';

export interface ProjectOwner { id: string; name: string; email: string; }
export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: ProjectOwner;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface ProjectInput { name: string; description?: string; }

export const projectsService = {
  list(search = '', signal?: AbortSignal): Promise<Project[]> {
    return requestJson(`/projects${search ? `?search=${encodeURIComponent(search)}` : ''}`, { signal });
  },
  get(id: string, signal?: AbortSignal): Promise<Project> { return requestJson(`/projects/${id}`, { signal }); },
  create(input: ProjectInput): Promise<Project> { return requestJson('/projects', { method: 'POST', body: input }); },
  update(id: string, input: ProjectInput): Promise<Project> { return requestJson(`/projects/${id}`, { method: 'PATCH', body: input }); },
  remove(id: string): Promise<Project> { return requestJson(`/projects/${id}`, { method: 'DELETE' }); },
};
