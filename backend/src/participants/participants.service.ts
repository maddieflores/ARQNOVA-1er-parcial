import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { ProjectsService } from '../projects/projects.service';
import { PROJECT_MEMBER_SELECT } from '../projects/project.select';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService) {}

  async list(projectId: string, ownerId: string) {
    await this.projects.verifyOwner(projectId, ownerId);
    return this.prisma.projectMember.findMany({ where: { projectId }, select: PROJECT_MEMBER_SELECT, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] });
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    try { await this.projects.validateAccess(projectId, userId); return true; } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  async add(projectId: string, ownerId: string, input: AddParticipantDto) {
    const dto = validateDto(AddParticipantDto, input);
    const project = await this.projects.verifyOwner(projectId, ownerId);
    if (project.ownerId === dto.userId) throw new ConflictException('El propietario ya tiene acceso al proyecto');
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { isActive: true } });
    if (!user) throw new NotFoundException('Usuario participante inexistente');
    if (!user.isActive) throw new ConflictException('No se puede agregar un usuario inactivo');
    try {
      return await this.prisma.projectMember.create({ data: { projectId, userId: dto.userId }, select: PROJECT_MEMBER_SELECT });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('El usuario ya participa en el proyecto');
      throw error;
    }
  }

  async remove(projectId: string, ownerId: string, userId: string) {
    const dto = validateDto(AddParticipantDto, { userId });
    await this.projects.verifyOwner(projectId, ownerId);
    try {
      return await this.prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId: dto.userId } }, select: PROJECT_MEMBER_SELECT });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Participante inexistente');
      throw error;
    }
  }
}
