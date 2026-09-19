import { Module } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { ParticipantsService } from '../participants/participants.service';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { ParticipantsController } from '../participants/participants.controller';
import { SharedProjectsController } from '../participants/shared-projects.controller';
import { InvitationsController } from '../invitations/invitations.controller';
import { ProjectInvitationsController } from '../invitations/project-invitations.controller';

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ProjectsController, ParticipantsController, SharedProjectsController, InvitationsController, ProjectInvitationsController],
  providers: [ProjectsService, ParticipantsService, InvitationsService],
  exports: [ProjectsService, ParticipantsService, InvitationsService],
})
export class ProjectsModule {}
