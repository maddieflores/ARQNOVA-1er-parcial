import { Module } from '@nestjs/common';
import { PasswordModule } from '../common/security/password.module';
import { RolesModule } from '../roles/roles.module';
import { UsersService } from './users.service';

@Module({ imports: [PasswordModule, RolesModule], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
