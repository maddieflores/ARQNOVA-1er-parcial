import { Module } from '@nestjs/common';
import { InvitationsService } from '../invitations/invitations.service';
import { ParticipantsService } from '../participants/participants.service';
import { ProjectsService } from './projects.service';

@Module({
  providers: [ProjectsService, ParticipantsService, InvitationsService],
  exports: [ProjectsService, ParticipantsService, InvitationsService],
})
export class ProjectsModule {}
