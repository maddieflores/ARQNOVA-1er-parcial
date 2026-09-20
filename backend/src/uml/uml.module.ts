import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';
import { UmlAttributesService } from './uml-attributes.service';
import { UmlClassesService } from './uml-classes.service';
import { UmlMethodsService } from './uml-methods.service';
import { UmlRelationsService } from './uml-relations.service';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [DiagramsController],
  providers: [DiagramsService, UmlClassesService, UmlAttributesService, UmlMethodsService, UmlRelationsService],
  exports: [DiagramsService, UmlClassesService, UmlAttributesService, UmlMethodsService, UmlRelationsService],
})
export class UmlModule {}
