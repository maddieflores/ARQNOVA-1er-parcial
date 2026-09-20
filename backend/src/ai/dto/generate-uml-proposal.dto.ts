import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateUmlProposalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt!: string;
}
