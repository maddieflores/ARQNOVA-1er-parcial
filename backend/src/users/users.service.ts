import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isEmail, isUUID } from 'class-validator';
import { PasswordService } from '../common/security/password.service';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PUBLIC_USER_SELECT } from './user.select';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly roles: RolesService,
  ) {}

  async findById(id: string) {
    if (!isUUID(id, '4')) throw new BadRequestException('ID de usuario inválido');
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('Usuario inexistente');
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: this.normalizeEmail(email) }, select: PUBLIC_USER_SELECT });
  }

  // Solo para el futuro servicio de autenticación. Nunca retornar este resultado desde un controlador.
  findCredentialsByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: { id: true, passwordHash: true, isActive: true, role: { select: { id: true, name: true } } },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  async getRole(userId: string) {
    return (await this.findById(userId)).role;
  }

  async create(input: CreateUserDto) {
    const dto = validateDto(CreateUserDto, input);
    if (await this.emailExists(dto.email)) throw new ConflictException('El email ya está registrado');
    await this.roles.findById(dto.roleId);
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash, roleId: dto.roleId, isActive: dto.isActive ?? true },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('El email ya está registrado');
        if (error.code === 'P2003') throw new NotFoundException('Rol inexistente');
      }
      throw new InternalServerErrorException('No se pudo crear el usuario');
    }
  }

  private normalizeEmail(email: string): string {
    if (typeof email !== 'string') throw new BadRequestException('Email inválido');
    const normalized = email.trim().toLowerCase();
    if (!isEmail(normalized) || normalized.length > 254) throw new BadRequestException('Email inválido');
    return normalized;
  }
}
