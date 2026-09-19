import { Module } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { ParticipantsService } from '../participants/participants.service';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ParticipantsService, InvitationsService],
  exports: [ProjectsService, ParticipantsService, InvitationsService],
})
export class ProjectsModule {}
