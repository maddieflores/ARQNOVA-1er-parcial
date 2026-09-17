const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
require('reflect-metadata');
process.loadEnvFile('.env');
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');
const { PasswordService } = require('../dist/common/security/password.service');
const { seedDevelopment } = require('../dist/prisma/development-seed');
const { configureApplication } = require('../dist/config/configure-app');

test('CU02 HTTP real en esquema aislado, sin modificar usuarios de desarrollo', async t => {
 const schema = `arqnova_test_${randomUUID().replaceAll('-', '')}`;
 assert.match(schema, /^arqnova_test_[a-f0-9]{32}$/);
 const root = new PrismaClient(); let temp; let app;
 const originalUrl = process.env.DATABASE_URL;
 try {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(originalUrl); url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  temp = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const sql = fs.readFileSync('prisma/migrations/20260917150421_init/migration.sql', 'utf8');
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await temp.$executeRawUnsafe(statement);
  const passwords = new PasswordService();
  const adminInput = { name: 'Administrador de prueba', email: `${randomUUID()}@example.test`, password: randomBytes(24).toString('hex') };
  const seeded = await seedDevelopment(temp, passwords, adminInput);
  const { AppModule } = require('../dist/app.module');
  app = await NestFactory.create(AppModule, { logger: false }); configureApplication(app); await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api`;
  const call = async (path, method = 'GET', body, token) => {
   const headers = { 'Content-Type': 'application/json' }; if (token) headers.Authorization = `Bearer ${token}`;
   const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
   const data = await res.json(); assert.equal(JSON.stringify(data).includes('passwordHash'), false);
   return { status: res.status, data };
  };
  const login = async input => call('/auth/login', 'POST', { email: input.email, password: input.password });
  const adminToken = (await login(adminInput)).data.accessToken;
  const roles = (await call('/roles', 'GET', undefined, adminToken)).data;
  const roleId = name => roles.find(role => role.name === name).id;
  let managed; const password = randomBytes(24).toString('hex');
  await t.test('administrador lista usuarios y roles seguros', async () => {
   const result = await call('/users', 'GET', undefined, adminToken); assert.equal(result.status, 200); assert.equal(result.data.length, 1);
   assert.equal(roles.length, 3); assert.deepEqual(Object.keys(roles[0]).sort(), ['description', 'id', 'name']);
  });
  await t.test('creación administrativa, bcrypt y actividad por defecto', async () => {
   const result = await call('/users', 'POST', { name: 'Usuario gestionado', email: `${randomUUID()}@example.test`, password, roleId: roleId('COLABORADOR') }, adminToken);
   assert.equal(result.status, 201); managed = result.data; assert.equal(managed.isActive, true);
   const row = await temp.user.findUniqueOrThrow({ where: { id: managed.id } });
   assert.equal(await passwords.compare(password, row.passwordHash), true); assert.equal(row.passwordHash === password, false);
  });
  await t.test('consulta, búsqueda nombre/email y lista vacía', async () => {
   assert.equal((await call(`/users/${managed.id}`, 'GET', undefined, adminToken)).data.id, managed.id);
   assert.equal((await call('/users?search=GESTIONADO', 'GET', undefined, adminToken)).data.length, 1);
   assert.equal((await call(`/users?search=${encodeURIComponent(managed.email)}`, 'GET', undefined, adminToken)).data.length, 1);
   assert.equal((await call(`/users?search=${randomUUID()}`, 'GET', undefined, adminToken)).data.length, 0);
  });
  await t.test('edición parcial y asignación de rol sin modificar contraseña', async () => {
   const before = await temp.user.findUniqueOrThrow({ where: { id: managed.id } });
   const result = await call(`/users/${managed.id}`, 'PATCH', { name: 'Nombre editado', roleId: roleId('ANFITRION') }, adminToken);
   assert.equal(result.status, 200); assert.equal(result.data.name, 'Nombre editado'); assert.equal(result.data.role.name, 'ANFITRION');
   assert.equal((await temp.user.findUniqueOrThrow({ where: { id: managed.id } })).passwordHash === before.passwordHash, true);
  });
  await t.test('desactivar bloquea login, me y endpoints protegidos; activar recupera acceso', async () => {
   const oldToken = (await login({ email: managed.email, password })).data.accessToken;
   assert.equal((await call(`/users/${managed.id}/status`, 'PATCH', { isActive: false }, adminToken)).status, 200);
   assert.equal((await login({ email: managed.email, password })).status, 401);
   assert.equal((await call('/auth/me', 'GET', undefined, oldToken)).status, 401);
   assert.equal((await call('/users', 'GET', undefined, oldToken)).status, 401);
   assert.equal((await call(`/users/${managed.id}/status`, 'PATCH', { isActive: true }, adminToken)).status, 200);
   assert.equal((await login({ email: managed.email, password })).status, 200);
  });
  await t.test('ANFITRION y COLABORADOR reciben 403 en todos los endpoints administrativos', async () => {
   for (const name of ['ANFITRION', 'COLABORADOR']) {
    await temp.user.update({ where: { id: managed.id }, data: { roleId: roleId(name) } });
    const token = (await login({ email: managed.email, password })).data.accessToken;
    for (const [path, method, body] of [['/users', 'GET'], [`/users/${managed.id}`, 'GET'], ['/roles', 'GET'], ['/users', 'POST', {}], [`/users/${managed.id}`, 'PATCH', { name: 'no' }], [`/users/${managed.id}/status`, 'PATCH', { isActive: false }]]) assert.equal((await call(path, method, body, token)).status, 403);
   }
  });
  await t.test('sin token: 401', async () => { for (const path of ['/users', '/roles', `/users/${managed.id}`]) assert.equal((await call(path)).status, 401); });
  await t.test('email duplicado, rol/usuario inexistentes y UUID inválido controlados', async () => {
   assert.equal((await call('/users', 'POST', { name: 'Otro', email: managed.email, password, roleId: roleId('COLABORADOR') }, adminToken)).status, 409);
   assert.equal((await call(`/users/${managed.id}`, 'PATCH', { email: adminInput.email }, adminToken)).status, 409);
   assert.equal((await call('/users', 'POST', { name: 'Otro', email: `${randomUUID()}@example.test`, password, roleId: randomUUID() }, adminToken)).status, 404);
   assert.equal((await call(`/users/${managed.id}`, 'PATCH', { roleId: randomUUID() }, adminToken)).status, 404);
   assert.equal((await call(`/users/${randomUUID()}`, 'GET', undefined, adminToken)).status, 404);
   assert.equal((await call(`/users/${randomUUID()}`, 'PATCH', { name: 'Otro' }, adminToken)).status, 404);
   assert.equal((await call('/users/invalid', 'GET', undefined, adminToken)).status, 400);
  });
  await t.test('datos inválidos, password en PATCH, null y estado no booleano se rechazan', async () => {
   for (const body of [{}, { password }, { name: null }, { email: 'invalid' }, { isActive: 'false' }]) assert.equal((await call(`/users/${managed.id}`, 'PATCH', body, adminToken)).status, 400);
   assert.equal((await call(`/users/${managed.id}/status`, 'PATCH', {}, adminToken)).status, 400);
   assert.equal((await call(`/users/${managed.id}/status`, 'PATCH', { isActive: false, name: 'extra' }, adminToken)).status, 400);
  });
  await t.test('último administrador no puede desactivarse ni cambiar de rol', async () => {
   for (const body of [{ isActive: false }, { roleId: roleId('COLABORADOR') }]) {
    const result = await call(`/users/${seeded.adminId}`, 'PATCH', body, adminToken); assert.equal(result.status, 409); assert.match(result.data.message, /último administrador/);
   }
   assert.equal((await call(`/users/${seeded.adminId}/status`, 'PATCH', { isActive: false }, adminToken)).status, 409);
  });
  await t.test('dos solicitudes simultáneas no eliminan todos los administradores', async () => {
   const second = await temp.user.create({ data: { name: 'Segundo admin', email: `${randomUUID()}@example.test`, passwordHash: await passwords.hash(password), roleId: roleId('ADMINISTRADOR') } });
   const results = await Promise.all([call(`/users/${seeded.adminId}/status`, 'PATCH', { isActive: false }, adminToken), call(`/users/${second.id}/status`, 'PATCH', { isActive: false }, adminToken)]);
   const statuses = results.map(r => r.status).sort();
   assert.equal(statuses[0], 200); assert.ok([401, 409].includes(statuses[1]));
   assert.equal(await temp.user.count({ where: { isActive: true, role: { name: 'ADMINISTRADOR' } } }), 1);
   // Aislar la protección transaccional del guard, que también puede bloquear por desactivación.
   await temp.user.updateMany({ where: { id: { in: [seeded.adminId, second.id] } }, data: { isActive: true } });
   const service = app.get(require('../dist/users/users.service').UsersService);
   const updates = await Promise.allSettled([service.update(seeded.adminId, { isActive: false }), service.update(second.id, { isActive: false })]);
   assert.equal(updates.filter(result => result.status === 'fulfilled').length, 1);
   assert.equal(updates.find(result => result.status === 'rejected').reason.getStatus(), 409);
   assert.equal(await temp.user.count({ where: { isActive: true, role: { name: 'ADMINISTRADOR' } } }), 1);
  });
 } finally {
  if (app) await app.close(); if (temp) await temp.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect();
 }
});
