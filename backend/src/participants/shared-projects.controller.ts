import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { SystemRole } from '../roles/system-role';
import { ParticipantsService } from './participants.service';

@Controller('shared-projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.COLABORADOR)
export class SharedProjectsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.participants.listShared(request.user!.id);
  }
}
