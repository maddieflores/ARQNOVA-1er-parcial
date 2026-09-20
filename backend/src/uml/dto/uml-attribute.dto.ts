import { UmlVisibility } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateUmlAttributeDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) type!: string;
  @IsOptional() @IsEnum(UmlVisibility) visibility?: UmlVisibility;
  @IsOptional() @IsBoolean() isPrimaryKey?: boolean;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateUmlAttributeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) type?: string;
  @IsOptional() @IsEnum(UmlVisibility) visibility?: UmlVisibility;
  @IsOptional() @IsBoolean() isPrimaryKey?: boolean;
  @IsOptional() @IsInt() @Min(0) position?: number;
}
