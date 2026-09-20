import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { AiService } from './ai.service';
import { GenerateUmlProposalDto } from './dto/generate-uml-proposal.dto';

@Controller('projects/:projectId/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post('uml-proposal')
  generate(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: GenerateUmlProposalDto) {
    return this.ai.generateUmlProposal(projectId, request.user!.id, dto);
  }
}
