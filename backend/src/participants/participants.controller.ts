import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { SystemRole } from '../roles/system-role';
import { ParticipantsService } from './participants.service';

@Controller('projects/:projectId/participants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ANFITRION)
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.participants.list(projectId, request.user!.id);
  }

  @Delete(':userId')
  remove(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string, @Param('userId') userId: string) {
    return this.participants.remove(projectId, request.user!.id, userId);
  }
}
