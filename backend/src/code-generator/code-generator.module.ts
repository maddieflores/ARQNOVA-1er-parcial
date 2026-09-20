import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UmlModule } from '../uml/uml.module';
import { CodeGeneratorController } from './code-generator.controller';
import { CodeGeneratorService } from './code-generator.service';

@Module({ imports: [AuthModule, UmlModule], controllers: [CodeGeneratorController], providers: [CodeGeneratorService], exports: [CodeGeneratorService] })
export class CodeGeneratorModule {}
