import { Transform } from 'class-transformer';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
export class ListUsersDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(100)
  search?: string;
}
