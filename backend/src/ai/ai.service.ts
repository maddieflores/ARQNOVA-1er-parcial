import { Injectable } from '@nestjs/common';
import { validateDto } from '../common/validate-dto';
import { DiagramsService } from '../uml/diagrams.service';
import { GenerateUmlProposalDto } from './dto/generate-uml-proposal.dto';
import { AiUmlProposalService } from './ai-uml-proposal.service';

@Injectable()
export class AiService {
  constructor(private readonly diagrams: DiagramsService, private readonly proposals: AiUmlProposalService) {}
  async generateUmlProposal(projectId: string, userId: string, input: GenerateUmlProposalDto) {
    const dto = validateDto(GenerateUmlProposalDto, input);
    await this.diagrams.validateProjectAccess(projectId, userId);
    return { proposal: await this.proposals.generate(dto.prompt.trim()) };
  }
}
