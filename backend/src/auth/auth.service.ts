import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { PasswordService } from '../common/security/password.service';
import { validateDto } from '../common/validate-dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import type { AuthUser } from './auth-user';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly passwords: PasswordService, private readonly jwt: JwtService) {}

  async login(input: LoginDto) {
    const dto = validateDto(LoginDto, input);
    const credentials = await this.users.findCredentialsByEmail(dto.email);
    if (!credentials || !credentials.isActive || !(await this.passwords.compare(dto.password, credentials.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const user = await this.currentUser(credentials.id);
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role.name });
    return { accessToken, user };
  }

  async authenticate(token: string): Promise<AuthUser> {
    let payload: { sub?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      if (!payload || typeof payload.sub !== 'string' || !isUUID(payload.sub, '4')) throw new Error('Invalid subject');
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
    return this.currentUser(payload.sub as string);
  }

  private async currentUser(id: string): Promise<AuthUser> {
    let user;
    try { user = await this.users.findById(id); }
    catch (error) {
      if (error instanceof NotFoundException) throw new UnauthorizedException('Sesión inválida o expirada');
      throw error;
    }
    if (!user.isActive) throw new UnauthorizedException('Sesión inválida o expirada');
    return { id: user.id, name: user.name, email: user.email, isActive: user.isActive, role: { id: user.role.id, name: user.role.name } };
  }
}
