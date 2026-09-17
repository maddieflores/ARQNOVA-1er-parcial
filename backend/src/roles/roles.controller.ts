import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { SystemRole } from './system-role';
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMINISTRADOR)
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.role.findMany({ where: { name: { in: Object.values(SystemRole) } }, select: { id: true, name: true, description: true }, orderBy: { name: 'asc' } });
  }
}
