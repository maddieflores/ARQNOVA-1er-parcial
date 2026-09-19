import { requestJson } from '../../services/http';
import type { Project } from '../projects/projects-service';

export interface Participant {
  id: string; projectId: string; userId: string; joinedAt: string;
  user: { id: string; name: string; email: string; isActive: boolean; role: { id: string; name: string } };
}
export interface Invitation {
  id: string; projectId: string; invitedUserId: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string; createdAt: string; acceptedAt: string | null;
  invitedUser: { id: string; name: string; email: string; role: { id: string; name: string } };
  project: Pick<Project, 'id' | 'name' | 'description' | 'owner'>;
}
export interface SharedProject { id: string; joinedAt: string; project: Project; }

export const participantsService = {
  list(projectId: string, signal?: AbortSignal): Promise<Participant[]> { return requestJson(`/projects/${projectId}/participants`, { signal }); },
  remove(projectId: string, userId: string): Promise<Participant> { return requestJson(`/projects/${projectId}/participants/${userId}`, { method: 'DELETE' }); },
  invitations(projectId: string, signal?: AbortSignal): Promise<Invitation[]> { return requestJson(`/projects/${projectId}/invitations`, { signal }); },
  invite(projectId: string, email: string): Promise<{ invitation: Invitation; token: string }> { return requestJson(`/projects/${projectId}/invitations`, { method: 'POST', body: { email } }); },
  getInvitation(token: string, signal?: AbortSignal): Promise<Invitation> { return requestJson(`/invitations/${token}`, { signal }); },
  accept(token: string): Promise<Participant> { return requestJson(`/invitations/${token}/accept`, { method: 'POST' }); },
  reject(token: string): Promise<Invitation> { return requestJson(`/invitations/${token}/reject`, { method: 'POST' }); },
  shared(signal?: AbortSignal): Promise<SharedProject[]> { return requestJson('/shared-projects', { signal }); },
};
