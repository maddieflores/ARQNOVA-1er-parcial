import { Prisma } from '@prisma/client';

// Selección explícita: passwordHash nunca aparece en los resultados de uso general.
export const PUBLIC_USER_SELECT = {
  id: true, name: true, email: true, isActive: true, roleId: true,
  createdAt: true, updatedAt: true,
  role: { select: { id: true, name: true, description: true } },
} satisfies Prisma.UserSelect;
