import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UsersController } from '../users/users.controller';
import { RolesController } from '../roles/roles.controller';
import { RolesModule } from '../roles/roles.module';
// Separar los controladores administrativos evita una dependencia circular Auth <-> Users.
@Module({ imports: [AuthModule, UsersModule, RolesModule], controllers: [UsersController, RolesController] })
export class AdministrationModule {}
