import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class InviteParticipantDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  expiresAt?: string;
}
