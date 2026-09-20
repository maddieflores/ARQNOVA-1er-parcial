import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { AiUmlProposalDto } from './ai-uml-proposal.dto';

export class ApplyUmlProposalDto {
  @ValidateNested()
  @Type(() => AiUmlProposalDto)
  proposal!: AiUmlProposalDto;
}
