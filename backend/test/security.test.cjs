const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const { Prisma } = require('@prisma/client');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { AppModule } = require('../dist/app.module');
const { PasswordService } = require('../dist/common/security/password.service');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { UsersService } = require('../dist/users/users.service');
const { CreateUserDto } = require('../dist/users/dto/create-user.dto');
const { UpdateUserDto } = require('../dist/users/dto/update-user.dto');
const { Permission, hasPermission } = require('../dist/roles/permissions');
const { SystemRole } = require('../dist/roles/system-role');
const { validateEnvironment } = require('../dist/config/validate-env');
const { seedDevelopment } = require('../dist/prisma/development-seed');

const password = () => randomBytes(24).toString('hex');
const validUser = () => ({ name: 'Usuario de prueba', email: `${randomUUID()}@example.test`, password: password(), roleId: randomUUID() });

test('DTOs rechazan datos inválidos, null, campos ajenos y contraseñas multibyte mayores a 72 bytes', () => {
 const options = { whitelist: true, forbidNonWhitelisted: true };
 const errors = (dto, input) => validateSync(plainToInstance(dto, input), options);
 assert.equal(errors(CreateUserDto, validUser()).length, 0);
 for (const change of [{ name: '  ' }, { email: 'invalido' }, { password: '' }, { password: '🙂'.repeat(19) }, { roleId: 'admin' }, { isActive: 'true' }, { isActive: null }, { passwordHash: 'prohibido' }]) {
   assert.ok(errors(CreateUserDto, { ...validUser(), ...change }).length > 0);
 }
 assert.equal(errors(UpdateUserDto, {}).length, 0);
 for (const change of [{ name: null }, { email: null }, { password: null }, { roleId: null }, { isActive: null }, { isActive: 'false' }]) assert.ok(errors(UpdateUserDto, change).length > 0);
 const normalized = plainToInstance(CreateUserDto, { ...validUser(), name: '  Nombre  ', email: '  ADMIN@EXAMPLE.TEST  ' });
 assert.equal(normalized.name, 'Nombre'); assert.equal(normalized.email, 'admin@example.test');
});

test('bcrypt usa salt, compara correctamente y rechaza truncamiento UTF-8', async () => {
 const passwords = new PasswordService();
 const input = password();
 const first = await passwords.hash(input); const second = await passwords.hash(input);
 assert.match(first, /^\$2b\$12\$/); assert.notEqual(first, second);
 assert.equal(await passwords.compare(input, first), true);
 assert.equal(await passwords.compare(password(), first), false);
 await assert.rejects(passwords.hash('🙂'.repeat(19)), { status: 400 });
 assert.equal(await passwords.compare('x'.repeat(73), first), false);
});

test('configuración JWT y permisos reservados fallan de forma segura', () => {
 const env = { DATABASE_URL: 'postgresql://example:example@localhost:5433/example', JWT_SECRET: randomBytes(32).toString('hex'), JWT_EXPIRES_IN: '3600' };
 assert.equal(validateEnvironment(env).JWT_EXPIRES_IN, 3600);
 assert.throws(() => validateEnvironment({ ...env, JWT_SECRET: '' }), /JWT_SECRET/);
 for (const expiry of ['0', '-1', '15m', '1.5']) assert.throws(() => validateEnvironment({ ...env, JWT_EXPIRES_IN: expiry }), /JWT_EXPIRES_IN/);
 assert.equal(hasPermission(SystemRole.ADMINISTRADOR, Permission.USERS_CREATE), true);
 assert.equal(hasPermission(SystemRole.COLABORADOR, Permission.USERS_CREATE), false);
 assert.equal(hasPermission('DESCONOCIDO', Permission.USERS_CREATE), false);
});

test('carreras de email y FK se traducen a excepciones Nest, sin detalles Prisma', async () => {
 for (const [code, status] of [['P2002', 409], ['P2003', 404], ['P2025', 500]]) {
   const prisma = { user: { findUnique: async () => null, create: async () => { throw new Prisma.PrismaClientKnownRequestError('detalle interno', { code, clientVersion: '6.12.0' }); } } };
   const service = new UsersService(prisma, { hash: async () => 'hash' }, { findById: async id => ({ id }) });
   await assert.rejects(service.create(validUser()), error => error.getStatus() === status && !error.message.includes('detalle interno'));
 }
});

test('PostgreSQL: roles, administrador, seed idempotente y servicio interno seguro', async () => {
 const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
 const prisma = app.get(PrismaService); const passwords = app.get(PasswordService); const users = app.get(UsersService);
 const createdIds = [];
 try {
   const config = app.get(ConfigService);
   const admin = { name: config.getOrThrow('ADMIN_NAME'), email: config.getOrThrow('ADMIN_EMAIL'), password: config.getOrThrow('ADMIN_PASSWORD') };
   const jwtOptions = app.get('JWT_MODULE_OPTIONS');
   assert.equal(jwtOptions.secret === config.get('JWT_SECRET'), true);
   assert.equal(jwtOptions.signOptions.expiresIn, config.get('JWT_EXPIRES_IN'));
   const before = await prisma.user.findUniqueOrThrow({ where: { email: admin.email.trim().toLowerCase() } });
   const counts = [await prisma.role.count(), await prisma.user.count()];
   const seed1 = await seedDevelopment(prisma, passwords, admin);
   const seed2 = await seedDevelopment(prisma, passwords, admin);
   assert.equal(seed1.adminId, seed2.adminId);
   assert.deepEqual([await prisma.role.count(), await prisma.user.count()], counts);
   const after = await prisma.user.findUniqueOrThrow({ where: { id: before.id }, include: { role: true } });
   assert.equal(after.passwordHash === before.passwordHash, true);
   assert.equal(after.passwordHash === admin.password, false);
   assert.equal(await passwords.compare(admin.password, after.passwordHash), true);
   assert.equal(after.role.name, SystemRole.ADMINISTRADOR);
   for (const name of Object.values(SystemRole)) assert.equal(await prisma.role.count({ where: { name } }), 1);
   const role = await prisma.role.findUniqueOrThrow({ where: { name: SystemRole.COLABORADOR } });
   const input = { ...validUser(), roleId: role.id, email: `TEST-${randomUUID()}@EXAMPLE.TEST` };
   const user = await users.create(input); createdIds.push(user.id);
   assert.equal(Object.hasOwn(user, 'passwordHash'), false);
   assert.equal(user.isActive, true); assert.equal(user.email, input.email.toLowerCase());
   assert.equal((await users.findById(user.id)).role.name, SystemRole.COLABORADOR);
   assert.equal((await users.findByEmail(input.email)).id, user.id);
   assert.equal(await users.emailExists(input.email), true);
   assert.equal((await users.getRole(user.id)).id, role.id);
   const credentials = await users.findCredentialsByEmail(input.email);
   assert.equal(await passwords.compare(input.password, credentials.passwordHash), true);
   await assert.rejects(users.create(input), error => error.getStatus() === 409);
   await assert.rejects(users.create({ ...validUser(), roleId: randomUUID() }), error => error.getStatus() === 404);
   await assert.rejects(users.findById(randomUUID()), error => error.getStatus() === 404);
   await assert.rejects(users.findById('incorrecto'), error => error.getStatus() === 400);
   await assert.rejects(users.create({ ...validUser(), email: 'incorrecto' }), error => error.getStatus() === 400);
   const snapshot = [await prisma.user.count(), await prisma.role.count()];
   await assert.rejects(seedDevelopment(prisma, passwords, { ...admin, email: input.email }), error => error.getStatus() === 409);
   assert.deepEqual([await prisma.user.count(), await prisma.role.count()], snapshot);
   assert.equal((await users.getRole(user.id)).name, SystemRole.COLABORADOR);
 } finally {
   if (createdIds.length) await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
   await app.close();
 }
});
