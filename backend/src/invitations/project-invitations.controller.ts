import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { SystemRole } from '../roles/system-role';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { InvitationsService } from './invitations.service';

@Controller('projects/:projectId/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ANFITRION)
export class ProjectInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.invitations.list(projectId, request.user!.id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string, @Body() dto: InviteParticipantDto) {
    return this.invitations.createByEmail(projectId, request.user!.id, dto);
  }
}
