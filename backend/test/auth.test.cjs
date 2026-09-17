const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { AppModule } = require('../dist/app.module');
const { configureApplication } = require('../dist/config/configure-app');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { UsersService } = require('../dist/users/users.service');

test('CU01: autenticación HTTP real con JWT y PostgreSQL', async t => {
 const app = await NestFactory.create(AppModule, { logger: false });
 configureApplication(app);
 await app.listen(0, '127.0.0.1');
 const base = `${await app.getUrl()}/api`;
 const prisma = app.get(PrismaService); const users = app.get(UsersService); const config = app.get(ConfigService); const jwt = app.get(JwtService);
 const ids = [];
 const request = async (path, { body, token, authorization, method } = {}) => {
   const headers = { 'Content-Type': 'application/json', Origin: config.get('CORS_ORIGIN') };
   if (token) headers.Authorization = `Bearer ${token}`;
   if (authorization) headers.Authorization = authorization;
   const response = await fetch(`${base}${path}`, { method: method ?? (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
   const data = await response.json();
   assert.equal(JSON.stringify(data).includes('passwordHash'), false);
   return { status: response.status, data, headers: response.headers };
 };
 try {
   const role = await prisma.role.findUniqueOrThrow({ where: { name: 'COLABORADOR' } });
   const input = { name: 'Prueba CU01', email: `${randomUUID()}@example.test`, password: randomBytes(24).toString('hex'), roleId: role.id };
   const user = await users.create(input); ids.push(user.id);
   let token;
   await t.test('login exitoso, normalización, JWT configurado y usuario público', async () => {
     const result = await request('/auth/login', { body: { email: `  ${input.email.toUpperCase()}  `, password: input.password } });
     assert.equal(result.status, 200); assert.equal(typeof result.data.accessToken, 'string');
     assert.equal(result.data.user.id, user.id); assert.equal(result.data.user.role.name, 'COLABORADOR');
     assert.deepEqual(Object.keys(result.data.user).sort(), ['email', 'id', 'isActive', 'name', 'role']);
     token = result.data.accessToken;
     const payload = await jwt.verifyAsync(token);
     assert.equal(payload.sub, user.id); assert.equal(payload.email, input.email); assert.equal(payload.role, 'COLABORADOR');
     assert.equal(payload.exp - payload.iat, config.get('JWT_EXPIRES_IN'));
     assert.equal(Object.hasOwn(payload, 'passwordHash'), false);
     assert.equal(result.headers.get('cache-control'), 'no-store');
     assert.equal(result.headers.get('access-control-allow-origin'), config.get('CORS_ORIGIN'));
   });
   await t.test('administrador del seed puede iniciar sesión', async () => {
     const result = await request('/auth/login', { body: { email: config.get('ADMIN_EMAIL'), password: config.get('ADMIN_PASSWORD') } });
     assert.equal(result.status, 200); assert.equal(result.data.user.role.name, 'ADMINISTRADOR');
   });
   await t.test('email inexistente y contraseña incorrecta dan el mismo 401 genérico', async () => {
     for (const body of [{ email: `${randomUUID()}@example.test`, password: input.password }, { email: input.email, password: randomBytes(24).toString('hex') }]) {
       const result = await request('/auth/login', { body });
       assert.equal(result.status, 401); assert.equal(result.data.message, 'Credenciales inválidas');
     }
   });
   await t.test('me con token válido retorna datos públicos actuales', async () => {
     const result = await request('/auth/me', { token });
     assert.equal(result.status, 200); assert.equal(result.data.id, user.id); assert.equal(result.data.isActive, true);
     assert.deepEqual(Object.keys(result.data).sort(), ['email', 'id', 'isActive', 'name', 'role']);
   });
   await t.test('me sin token, token inválido, expirado, firma/algoritmo inválidos: 401', async () => {
     const expired = await jwt.signAsync({ sub: user.id }, { expiresIn: -1 });
     const wrongSecret = await jwt.signAsync({ sub: user.id }, { secret: randomBytes(32).toString('hex') });
     const wrongAlgorithm = await jwt.signAsync({ sub: user.id }, { algorithm: 'HS384' });
     const invalidSubject = await jwt.signAsync({ sub: 'no-uuid' });
     for (const value of [undefined, 'token-invalido', expired, wrongSecret, wrongAlgorithm, invalidSubject]) {
       assert.equal((await request('/auth/me', { token: value })).status, 401);
     }
     assert.equal((await request('/auth/me', { authorization: 'Basic invalid' })).status, 401);
   });
   await t.test('DTO login rechaza datos inválidos y propiedades ajenas', async () => {
     for (const body of [{ email: 'incorrecto', password: input.password }, { email: input.email }, { email: input.email, password: '' }, { email: input.email, password: '🙂'.repeat(19) }, { email: input.email, password: input.password, isActive: true }]) {
       assert.equal((await request('/auth/login', { body })).status, 400);
     }
   });
   await t.test('usuario desactivado no puede iniciar sesión ni usar un JWT previo', async () => {
     await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
     const result = await request('/auth/login', { body: { email: input.email, password: input.password } });
     assert.equal(result.status, 401); assert.equal(result.data.message, 'Credenciales inválidas');
     assert.equal((await request('/auth/me', { token })).status, 401);
   });
   await t.test('usuario eliminado no puede usar token previo; health sigue público', async () => {
     await prisma.user.delete({ where: { id: user.id } });
     assert.equal((await request('/auth/me', { token })).status, 401);
     const health = await request('/health'); assert.equal(health.status, 200); assert.equal(health.data.status, 'ok');
   });
 } finally {
   if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
   await app.close();
 }
});
