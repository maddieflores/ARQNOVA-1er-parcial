import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { MaxUtf8Bytes } from '../../common/security/max-utf8-bytes.decorator';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '../../common/security/password.service';

export class CreateUserDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxUtf8Bytes(PASSWORD_MAX_BYTES)
  password!: string;

  @IsUUID('4')
  roleId!: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
