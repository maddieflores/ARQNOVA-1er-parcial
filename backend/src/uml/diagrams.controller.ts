import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDiagramDto } from './dto/diagram.dto';
import { CreateUmlAttributeDto, UpdateUmlAttributeDto } from './dto/uml-attribute.dto';
import { CreateUmlClassDto, MoveUmlClassDto, UpdateUmlClassDto } from './dto/uml-class.dto';
import { CreateUmlMethodDto, UpdateUmlMethodDto } from './dto/uml-method.dto';
import { CreateUmlRelationDto, UpdateUmlRelationDto } from './dto/uml-relation.dto';
import { DiagramsService } from './diagrams.service';
import { UmlAttributesService } from './uml-attributes.service';
import { UmlClassesService } from './uml-classes.service';
import { UmlMethodsService } from './uml-methods.service';
import { UmlRelationsService } from './uml-relations.service';

@Controller('projects/:projectId/diagram')
@UseGuards(JwtAuthGuard)
export class DiagramsController {
  constructor(
    private readonly diagrams: DiagramsService,
    private readonly classes: UmlClassesService,
    private readonly attributes: UmlAttributesService,
    private readonly methods: UmlMethodsService,
    private readonly relations: UmlRelationsService,
  ) {}

  @Get()
  get(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest) {
    return this.diagrams.getOrCreateByProject(projectId, request.user!.id);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateDiagramDto) {
    return this.diagrams.create(projectId, request.user!.id, dto);
  }

  @Post('classes')
  async createClass(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateUmlClassDto) {
    const diagram = await this.diagram(projectId, request); return this.classes.create(diagram.id, request.user!.id, dto);
  }

  @Patch('classes/:classId')
  async updateClass(@Param('projectId') projectId: string, @Param('classId') classId: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateUmlClassDto) {
    const diagram = await this.diagram(projectId, request); return this.classes.update(classId, request.user!.id, dto, diagram.id);
  }

  @Patch('classes/:classId/position')
  async moveClass(@Param('projectId') projectId: string, @Param('classId') classId: string, @Req() request: AuthenticatedRequest, @Body() dto: MoveUmlClassDto) {
    const diagram = await this.diagram(projectId, request); return this.classes.move(classId, request.user!.id, dto, diagram.id);
  }

  @Delete('classes/:classId')
  async removeClass(@Param('projectId') projectId: string, @Param('classId') classId: string, @Req() request: AuthenticatedRequest) {
    const diagram = await this.diagram(projectId, request); return this.classes.remove(classId, request.user!.id, diagram.id);
  }

  @Post('classes/:classId/attributes')
  async createAttribute(@Param('projectId') projectId: string, @Param('classId') classId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateUmlAttributeDto) {
    const diagram = await this.diagram(projectId, request); return this.attributes.create(classId, request.user!.id, dto, diagram.id);
  }

  @Patch('classes/:classId/attributes/:attributeId')
  async updateAttribute(@Param('projectId') projectId: string, @Param('classId') classId: string, @Param('attributeId') attributeId: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateUmlAttributeDto) {
    const diagram = await this.diagram(projectId, request); return this.attributes.update(attributeId, request.user!.id, dto, classId, diagram.id);
  }

  @Delete('classes/:classId/attributes/:attributeId')
  async removeAttribute(@Param('projectId') projectId: string, @Param('classId') classId: string, @Param('attributeId') attributeId: string, @Req() request: AuthenticatedRequest) {
    const diagram = await this.diagram(projectId, request); return this.attributes.remove(attributeId, request.user!.id, classId, diagram.id);
  }

  @Post('classes/:classId/methods')
  async createMethod(@Param('projectId') projectId: string, @Param('classId') classId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateUmlMethodDto) {
    const diagram = await this.diagram(projectId, request); return this.methods.create(classId, request.user!.id, dto, diagram.id);
  }

  @Patch('classes/:classId/methods/:methodId')
  async updateMethod(@Param('projectId') projectId: string, @Param('classId') classId: string, @Param('methodId') methodId: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateUmlMethodDto) {
    const diagram = await this.diagram(projectId, request); return this.methods.update(methodId, request.user!.id, dto, classId, diagram.id);
  }

  @Delete('classes/:classId/methods/:methodId')
  async removeMethod(@Param('projectId') projectId: string, @Param('classId') classId: string, @Param('methodId') methodId: string, @Req() request: AuthenticatedRequest) {
    const diagram = await this.diagram(projectId, request); return this.methods.remove(methodId, request.user!.id, classId, diagram.id);
  }

  @Post('relations')
  async createRelation(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateUmlRelationDto) {
    const diagram = await this.diagram(projectId, request); return this.relations.create(diagram.id, request.user!.id, dto);
  }

  @Patch('relations/:relationId')
  async updateRelation(@Param('projectId') projectId: string, @Param('relationId') relationId: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateUmlRelationDto) {
    const diagram = await this.diagram(projectId, request); return this.relations.update(relationId, request.user!.id, dto, diagram.id);
  }

  @Delete('relations/:relationId')
  async removeRelation(@Param('projectId') projectId: string, @Param('relationId') relationId: string, @Req() request: AuthenticatedRequest) {
    const diagram = await this.diagram(projectId, request); return this.relations.remove(relationId, request.user!.id, diagram.id);
  }

  private diagram(projectId: string, request: AuthenticatedRequest) {
    return this.diagrams.getOrCreateByProject(projectId, request.user!.id);
  }
}
