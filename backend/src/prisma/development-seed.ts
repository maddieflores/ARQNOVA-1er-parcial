import { ConflictException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PasswordService } from '../common/security/password.service';
import { validateDto } from '../common/validate-dto';
import { INITIAL_ROLES, SystemRole } from '../roles/system-role';
import { CreateUserDto } from '../users/dto/create-user.dto';

export async function seedDevelopment(
  prisma: PrismaClient,
  passwords: PasswordService,
  admin: { name: string; email: string; password: string },
) {
  // Validar todo antes de escribir. roleId temporal solo permite reutilizar el DTO.
  const dto = validateDto(CreateUserDto, { ...admin, roleId: '00000000-0000-4000-8000-000000000000' });
  const passwordHash = await passwords.hash(dto.password);
  return prisma.$transaction(async tx => {
    const roles = await Promise.all(INITIAL_ROLES.map(role => tx.role.upsert({
      where: { name: role.name }, create: role, update: {},
    })));
    const administrator = roles.find(role => role.name === SystemRole.ADMINISTRADOR)!;
    const user = await tx.user.upsert({
      where: { email: dto.email },
      create: { name: dto.name, email: dto.email, passwordHash, roleId: administrator.id },
      update: {},
      select: { id: true, roleId: true, isActive: true },
    });
    if (user.roleId !== administrator.id || !user.isActive) {
      throw new ConflictException('El email del seed pertenece a una cuenta no administradora o inactiva; no se modificó');
    }
    return { roleCount: roles.length, adminId: user.id };
  });
}
