import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { SystemRole } from '../roles/system-role';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatusDto } from './dto/user-status.dto';
import { ListUsersDto } from './dto/list-users.dto';
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMINISTRADOR)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list(@Query() query: ListUsersDto) { return this.users.list(query); }
  @Get(':id') get(@Param('id') id: string) { return this.users.findById(id); }
  @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Patch(':id/status') status(@Param('id') id: string, @Body() dto: UserStatusDto) { return this.users.update(id, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
}
