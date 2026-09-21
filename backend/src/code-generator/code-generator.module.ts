import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UmlModule } from '../uml/uml.module';
import { CodeGeneratorController } from './code-generator.controller';
import { CodeGeneratorService } from './code-generator.service';
import { GeneratedBackendValidator } from './generated-backend-validator.service';

@Module({ imports: [AuthModule, UmlModule], controllers: [CodeGeneratorController], providers: [CodeGeneratorService, GeneratedBackendValidator], exports: [CodeGeneratorService] })
export class CodeGeneratorModule {}
