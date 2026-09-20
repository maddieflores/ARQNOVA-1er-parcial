import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { UmlRelationType, UmlVisibility } from '@prisma/client';

const MULTIPLICITY = /^(?:\*|\d+|\d+\.\.(?:\d+|\*))$/;

export class AiUmlAttributeDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) type!: string;
  @IsEnum(UmlVisibility) visibility!: UmlVisibility;
  @IsOptional() @IsBoolean() isPrimaryKey?: boolean;
}

export class AiUmlMethodDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) returnType!: string;
  @IsEnum(UmlVisibility) visibility!: UmlVisibility;
}

export class AiUmlClassDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => AiUmlAttributeDto) attributes!: AiUmlAttributeDto[];
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => AiUmlMethodDto) methods!: AiUmlMethodDto[];
}

export class AiUmlRelationDto {
  @IsString() @IsNotEmpty() @MaxLength(80) sourceClassName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) targetClassName!: string;
  @IsEnum(UmlRelationType) type!: UmlRelationType;
  @IsOptional() @IsString() @Matches(MULTIPLICITY) sourceMultiplicity?: string;
  @IsOptional() @IsString() @Matches(MULTIPLICITY) targetMultiplicity?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) label?: string;
}

export class AiUmlProposalDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => AiUmlClassDto) classes!: AiUmlClassDto[];
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => AiUmlRelationDto) relations!: AiUmlRelationDto[];
}
