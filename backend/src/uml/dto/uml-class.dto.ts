import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUmlClassDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsNumber({ allowInfinity: false, allowNaN: false }) x!: number;
  @IsNumber({ allowInfinity: false, allowNaN: false }) y!: number;
  @IsOptional() @IsNumber({ allowInfinity: false, allowNaN: false }) width?: number;
  @IsOptional() @IsNumber({ allowInfinity: false, allowNaN: false }) height?: number;
  @IsOptional() @IsBoolean() isAbstract?: boolean;
}

export class UpdateUmlClassDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsNumber({ allowInfinity: false, allowNaN: false }) width?: number;
  @IsOptional() @IsNumber({ allowInfinity: false, allowNaN: false }) height?: number;
  @IsOptional() @IsBoolean() isAbstract?: boolean;
}

export class MoveUmlClassDto {
  @IsNumber({ allowInfinity: false, allowNaN: false }) x!: number;
  @IsNumber({ allowInfinity: false, allowNaN: false }) y!: number;
}
