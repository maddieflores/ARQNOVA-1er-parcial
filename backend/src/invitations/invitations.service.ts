import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { PROJECT_MEMBER_SELECT } from '../projects/project.select';

const INVITATION_SELECT = {
  id: true, projectId: true, invitedUserId: true, status: true,
  expiresAt: true, createdAt: true, acceptedAt: true,
  invitedUser: { select: { id: true, name: true, email: true, role: { select: { id: true, name: true } } } },
  project: { select: { id: true, name: true, description: true, owner: { select: { id: true, name: true, email: true } } } },
} satisfies Prisma.ProjectInvitationSelect;

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService) {}

  async createByEmail(projectId: string, ownerId: string, input: InviteParticipantDto) {
    const dto = validateDto(InviteParticipantDto, input);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (!user) throw new NotFoundException('Usuario invitado inexistente');
    return this.create(projectId, ownerId, { invitedUserId: user.id, expiresAt: dto.expiresAt });
  }

  async create(projectId: string, ownerId: string, input: CreateInvitationDto) {
    const dto = validateDto(CreateInvitationDto, input);
    const project = await this.projects.verifyOwner(projectId, ownerId);
    if (project.ownerId === dto.invitedUserId) throw new ConflictException('El propietario no necesita una invitación');
    const user = await this.prisma.user.findUnique({ where: { id: dto.invitedUserId }, select: { isActive: true } });
    if (!user) throw new NotFoundException('Usuario invitado inexistente');
    if (!user.isActive) throw new ConflictException('No se puede invitar a un usuario inactivo');
    if (await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: dto.invitedUserId } } })) {
      throw new ConflictException('El usuario ya participa en el proyecto');
    }
    const duplicate = await this.prisma.projectInvitation.findFirst({ where: { projectId, invitedUserId: dto.invitedUserId, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } } });
    if (duplicate) throw new ConflictException('Ya existe una invitación vigente para este usuario');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const maximum = Date.now() + 30 * 24 * 60 * 60 * 1000;
    if (expiresAt.getTime() <= Date.now() || expiresAt.getTime() > maximum) throw new BadRequestException('La invitación debe vencer dentro de los próximos 30 días');
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.projectInvitation.create({
      data: { projectId, invitedUserId: dto.invitedUserId, tokenHash: this.hashToken(token), expiresAt },
      select: INVITATION_SELECT,
    });
    return { invitation, token };
  }

  async findByToken(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new BadRequestException('Token de invitación inválido');
    const invitation = await this.prisma.projectInvitation.findUnique({ where: { tokenHash: this.hashToken(token) }, select: INVITATION_SELECT });
    if (!invitation) throw new NotFoundException('Invitación inexistente');
    return invitation;
  }

  async list(projectId: string, ownerId: string) {
    await this.projects.verifyOwner(projectId, ownerId);
    await this.prisma.projectInvitation.updateMany({
      where: { projectId, status: InvitationStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: InvitationStatus.EXPIRED },
    });
    return this.prisma.projectInvitation.findMany({
      where: { projectId }, select: INVITATION_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async validate(token: string, invitedUserId: string) {
    if (!isUUID(invitedUserId, '4')) throw new BadRequestException('ID de usuario invitado inválido');
    const invitation = await this.findByToken(token);
    if (invitation.invitedUserId !== invitedUserId) throw new ForbiddenException('La invitación no pertenece al usuario');
    if (invitation.status !== InvitationStatus.PENDING) throw new ConflictException('La invitación ya no está pendiente');
    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED } });
      throw new ConflictException('La invitación expiró');
    }
    await this.projects.findById(invitation.projectId);
    return invitation;
  }

  async accept(token: string, invitedUserId: string) {
    const invitation = await this.validate(token, invitedUserId);
    try {
      return await this.prisma.$transaction(async tx => {
        const current = await tx.projectInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
        if (current.status !== InvitationStatus.PENDING || current.expiresAt.getTime() <= Date.now()) throw new ConflictException('La invitación ya no es válida');
        const membership = await tx.projectMember.create({ data: { projectId: current.projectId, userId: invitedUserId }, select: PROJECT_MEMBER_SELECT });
        await tx.projectInvitation.update({ where: { id: current.id }, data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() } });
        return membership;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('El usuario ya participa en el proyecto');
      throw error;
    }
  }

  async reject(token: string, invitedUserId: string) {
    const invitation = await this.validate(token, invitedUserId);
    return this.prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.REJECTED }, select: INVITATION_SELECT });
  }

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
