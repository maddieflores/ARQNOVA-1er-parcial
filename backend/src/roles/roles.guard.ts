import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { ROLES_KEY } from './roles.decorator';
import { SystemRole } from './system-role';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException('Sesión inválida o expirada');
    const roles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || !roles.includes(user.role.name as SystemRole)) throw new ForbiddenException('No tienes permiso para realizar esta acción');
    return true;
  }
}
