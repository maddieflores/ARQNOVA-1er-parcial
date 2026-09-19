import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get(':token')
  get(@Req() request: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.validate(token, request.user!.id);
  }

  @Post(':token/accept')
  accept(@Req() request: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.accept(token, request.user!.id);
  }

  @Post(':token/reject')
  reject(@Req() request: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.reject(token, request.user!.id);
  }
}
