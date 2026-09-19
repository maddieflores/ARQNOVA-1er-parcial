import { Prisma } from '@prisma/client';

export const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ProjectSelect;

export const PROJECT_MEMBER_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, isActive: true } },
} satisfies Prisma.ProjectMemberSelect;
