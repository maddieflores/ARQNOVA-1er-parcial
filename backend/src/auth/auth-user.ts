export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string };
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: AuthUser;
}
