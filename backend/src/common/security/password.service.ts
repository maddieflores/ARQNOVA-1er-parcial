import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export function assertPasswordPolicy(password: string): void {
  if (typeof password !== 'string' || [...password].length < PASSWORD_MIN_LENGTH ||
      Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new BadRequestException('La contraseña debe tener al menos 10 caracteres y como máximo 72 bytes UTF-8');
  }
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    assertPasswordPolicy(password);
    return bcrypt.hash(password, 12);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    // bcrypt trunca entradas mayores a 72 bytes; rechazarlas evita equivalencias inesperadas.
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return false;
    return bcrypt.compare(password, hash);
  }
}
