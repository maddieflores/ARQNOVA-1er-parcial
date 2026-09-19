import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesGuard } from './roles.guard';

@Module({ providers: [RolesService, RolesGuard], exports: [RolesService, RolesGuard] })
export class RolesModule {}
