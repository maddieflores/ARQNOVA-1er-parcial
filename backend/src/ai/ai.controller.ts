import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { AiService } from './ai.service';
import { GenerateUmlProposalDto } from './dto/generate-uml-proposal.dto';
import { ApplyUmlProposalDto } from './dto/apply-uml-proposal.dto';
import { AiUmlApplyService } from './ai-uml-apply.service';

@Controller('projects/:projectId/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService, private readonly applyService: AiUmlApplyService) {}
  @Post('uml-proposal')
  generate(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: GenerateUmlProposalDto) {
    return this.ai.generateUmlProposal(projectId, request.user!.id, dto);
  }
  @Post('apply-uml-proposal')
  apply(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: ApplyUmlProposalDto) {
    return this.applyService.apply(projectId, request.user!.id, dto);
  }
}
