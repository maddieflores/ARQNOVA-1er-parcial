import { SetMetadata } from '@nestjs/common';
import { SystemRole } from './system-role';
export const ROLES_KEY = 'allowedRoles';
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
