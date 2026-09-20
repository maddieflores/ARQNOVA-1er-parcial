import { UmlVisibility } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateUmlMethodDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) returnType!: string;
  @IsOptional() @IsEnum(UmlVisibility) visibility?: UmlVisibility;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateUmlMethodDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) returnType?: string;
  @IsOptional() @IsEnum(UmlVisibility) visibility?: UmlVisibility;
  @IsOptional() @IsInt() @Min(0) position?: number;
}
