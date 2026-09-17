import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UsersController } from '../users/users.controller';
import { RolesController } from '../roles/roles.controller';
import { RolesGuard } from '../roles/roles.guard';
// Separar los controladores administrativos evita una dependencia circular Auth <-> Users.
@Module({ imports: [AuthModule, UsersModule], controllers: [UsersController, RolesController], providers: [RolesGuard] })
export class AdministrationModule {}
