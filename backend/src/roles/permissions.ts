import { SetMetadata } from '@nestjs/common';
import { SystemRole } from './system-role';

// Base de CU02. No se aplican a endpoints en Fase 1A.
export enum Permission {
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  ROLES_READ = 'roles:read',
}

export const ROLE_PERMISSIONS: Readonly<Record<SystemRole, readonly Permission[]>> = {
  [SystemRole.ADMINISTRADOR]: Object.values(Permission),
  // Los permisos funcionales restantes se definirán al implementar sus casos de uso.
  [SystemRole.ANFITRION]: [],
  [SystemRole.COLABORADOR]: [],
};

export function hasPermission(role: string, permission: Permission): boolean {
  if (!Object.values(SystemRole).includes(role as SystemRole)) return false;
  return ROLE_PERMISSIONS[role as SystemRole].includes(permission);
}

export const PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
