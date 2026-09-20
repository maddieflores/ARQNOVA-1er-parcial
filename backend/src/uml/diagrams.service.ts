import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateDiagramDto } from './dto/diagram.dto';
import { SystemRole } from '../roles/system-role';

const COMPLETE_DIAGRAM = {
  classes: {
    include: {
      attributes: { orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }] },
      methods: { orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }] },
    },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
  relations: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
};

@Injectable()
export class DiagramsService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService) {}

  async create(projectId: string, userId: string, input: CreateDiagramDto) {
    const dto = validateDto(CreateDiagramDto, input);
    await this.validateProjectAccess(projectId, userId);
    const existing = await this.prisma.diagram.findUnique({ where: { projectId }, select: { id: true } });
    if (existing) throw new ConflictException('El proyecto ya tiene un diagrama principal');
    return this.prisma.diagram.create({ data: { projectId, name: dto.name.trim() }, include: COMPLETE_DIAGRAM });
  }

  async getByProject(projectId: string, userId: string) {
    await this.validateProjectAccess(projectId, userId);
    const diagram = await this.prisma.diagram.findUnique({ where: { projectId }, include: COMPLETE_DIAGRAM });
    if (!diagram) throw new NotFoundException('Diagrama inexistente');
    return diagram;
  }

  async getOrCreateByProject(projectId: string, userId: string) {
    const project = await this.validateProjectAccess(projectId, userId);
    const existing = await this.prisma.diagram.findUnique({ where: { projectId }, include: COMPLETE_DIAGRAM });
    if (existing) return existing;
    try {
      return await this.prisma.diagram.create({ data: { projectId, name: `Diagrama de ${project.name}` }, include: COMPLETE_DIAGRAM });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.diagram.findUniqueOrThrow({ where: { projectId }, include: COMPLETE_DIAGRAM });
      }
      throw error;
    }
  }

  async verifyAccess(diagramId: string, userId: string) {
    this.validateId(diagramId, 'diagrama');
    const diagram = await this.prisma.diagram.findUnique({ where: { id: diagramId }, select: { id: true, projectId: true } });
    if (!diagram) throw new NotFoundException('Diagrama inexistente');
    await this.validateProjectAccess(diagram.projectId, userId);
    return diagram;
  }

  async validateProjectAccess(projectId: string, userId: string) {
    const project = await this.projects.validateAccess(projectId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: { select: { name: true } } } });
    const isOwner = project.ownerId === userId && user?.role.name === SystemRole.ANFITRION;
    const isCollaborator = project.ownerId !== userId && user?.role.name === SystemRole.COLABORADOR;
    if (!isOwner && !isCollaborator) throw new ForbiddenException('El usuario no tiene acceso al editor UML');
    return project;
  }

  private validateId(id: string, label: string) {
    if (!isUUID(id, '4')) throw new BadRequestException(`ID de ${label} inválido`);
  }
}
