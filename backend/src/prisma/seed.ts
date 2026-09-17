import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { PasswordService } from '../common/security/password.service';

import { PrismaService } from './prisma.service';
import { seedDevelopment } from './development-seed';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const config = app.get(ConfigService);
    if (config.get<string>('NODE_ENV') === 'production') throw new Error('El seed está reservado a desarrollo');
    const name = config.get<string>('ADMIN_NAME');
    const email = config.get<string>('ADMIN_EMAIL');
    const password = config.get<string>('ADMIN_PASSWORD');
    if (!name || !email || !password) throw new Error('Configure ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD');
    const result = await seedDevelopment(app.get(PrismaService), app.get(PasswordService), { name, email, password });
    console.log(`Seed de desarrollo correcto: ${result.roleCount} roles y administrador disponible. No se sobrescribieron cuentas.`);
  } finally {
    await app.close();
  }
}

main().catch(() => {
  new Logger('Seed').error('Seed no ejecutado: revise conexión, variables ADMIN_* y que el email no pertenezca a una cuenta no administradora o inactiva.');
  process.exitCode = 1;
});
