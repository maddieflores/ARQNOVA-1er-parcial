import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateDiagramDto } from './dto/diagram.dto';

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
    await this.projects.validateAccess(projectId, userId);
    const existing = await this.prisma.diagram.findUnique({ where: { projectId }, select: { id: true } });
    if (existing) throw new ConflictException('El proyecto ya tiene un diagrama principal');
    return this.prisma.diagram.create({ data: { projectId, name: dto.name.trim() }, include: COMPLETE_DIAGRAM });
  }

  async getByProject(projectId: string, userId: string) {
    await this.projects.validateAccess(projectId, userId);
    const diagram = await this.prisma.diagram.findUnique({ where: { projectId }, include: COMPLETE_DIAGRAM });
    if (!diagram) throw new NotFoundException('Diagrama inexistente');
    return diagram;
  }

  async verifyAccess(diagramId: string, userId: string) {
    this.validateId(diagramId, 'diagrama');
    const diagram = await this.prisma.diagram.findUnique({ where: { id: diagramId }, select: { id: true, projectId: true } });
    if (!diagram) throw new NotFoundException('Diagrama inexistente');
    await this.projects.validateAccess(diagram.projectId, userId);
    return diagram;
  }

  private validateId(id: string, label: string) {
    if (!isUUID(id, '4')) throw new BadRequestException(`ID de ${label} inválido`);
  }
}
