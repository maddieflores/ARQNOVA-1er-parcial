import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID('4')
  invitedUserId!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  expiresAt?: string;
}
