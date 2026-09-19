const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs');
require('reflect-metadata'); process.loadEnvFile('.env');
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');
const { PasswordService } = require('../dist/common/security/password.service');
const { configureApplication } = require('../dist/config/configure-app');

test('CU04 gestiona participantes e invitaciones por HTTP en esquema aislado', async t => {
 const schema = `arqnova_test_${randomUUID().replaceAll('-', '')}`; const root = new PrismaClient(); let temp; let app; const originalUrl = process.env.DATABASE_URL;
 try {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); const url = new URL(originalUrl); url.searchParams.set('schema', schema); process.env.DATABASE_URL = url.toString();
  temp = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  for (const directory of fs.readdirSync('prisma/migrations').sort()) { const path = `prisma/migrations/${directory}/migration.sql`; if (fs.existsSync(path)) for (const sql of fs.readFileSync(path, 'utf8').split(';').map(value => value.trim()).filter(Boolean)) await temp.$executeRawUnsafe(sql); }
  const roles = {}; for (const name of ['ADMINISTRADOR', 'ANFITRION', 'COLABORADOR']) roles[name] = await temp.role.create({ data: { name } });
  const passwords = new PasswordService(); const createUser = async role => { const password = randomBytes(24).toString('hex'); const user = await temp.user.create({ data: { name: `Usuario ${role}`, email: `${randomUUID()}@example.test`, passwordHash: await passwords.hash(password), roleId: roles[role].id } }); return { ...user, password }; };
  const owner = await createUser('ANFITRION'); const otherHost = await createUser('ANFITRION'); const collaborator = await createUser('COLABORADOR'); const second = await createUser('COLABORADOR'); const concurrent = await createUser('COLABORADOR'); const concurrentInvite = await createUser('COLABORADOR');
  const project = await temp.project.create({ data: { name: 'Proyecto CU04', ownerId: owner.id } });
  const { AppModule } = require('../dist/app.module'); app = await NestFactory.create(AppModule, { logger: false }); configureApplication(app); await app.listen(0, '127.0.0.1'); const base = `${await app.getUrl()}/api`;
  const call = async (path, method = 'GET', body, token) => { const headers = { 'Content-Type': 'application/json' }; if (token) headers.Authorization = `Bearer ${token}`; const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await response.json(); assert.equal(JSON.stringify(data).includes('passwordHash'), false); assert.equal(JSON.stringify(data).includes('tokenHash'), false); return { status: response.status, data }; };
  const tokenFor = async user => (await call('/auth/login', 'POST', { email: user.email, password: user.password })).data.accessToken;
  const ownerToken = await tokenFor(owner); const otherToken = await tokenFor(otherHost); const collaboratorToken = await tokenFor(collaborator);
  let invitation; let secondInvitation; let rejectInvitation;
  await t.test('propietario lista vacío y crea invitación segura con expiración', async () => {
   assert.deepEqual((await call(`/projects/${project.id}/participants`, 'GET', undefined, ownerToken)).data, []);
   const result = await call(`/projects/${project.id}/invitations`, 'POST', { email: collaborator.email.toUpperCase() }, ownerToken); assert.equal(result.status, 201); invitation = result.data;
   assert.equal(invitation.invitation.invitedUserId, collaborator.id); assert.equal(typeof invitation.token, 'string'); assert.equal(invitation.token.length, 43); assert.ok(new Date(invitation.invitation.expiresAt) > new Date());
   const list = await call(`/projects/${project.id}/invitations`, 'GET', undefined, ownerToken); assert.equal(list.status, 200); assert.equal(list.data.length, 1); assert.equal(Object.hasOwn(list.data[0], 'token'), false);
  });
  await t.test('usuario inexistente, propietario y duplicado pendiente son rechazados', async () => {
   assert.equal((await call(`/projects/${project.id}/invitations`, 'POST', { email: `${randomUUID()}@example.test` }, ownerToken)).status, 404);
   assert.equal((await call(`/projects/${project.id}/invitations`, 'POST', { email: owner.email }, ownerToken)).status, 409);
   assert.equal((await call(`/projects/${project.id}/invitations`, 'POST', { email: collaborator.email }, ownerToken)).status, 409);
  });
  await t.test('tokens son únicos y usuario incorrecto no acepta', async () => {
   const another = await call(`/projects/${project.id}/invitations`, 'POST', { email: second.email }, ownerToken); secondInvitation = another.data; assert.notEqual(secondInvitation.token, invitation.token);
   assert.equal((await call(`/invitations/${invitation.token}/accept`, 'POST', undefined, await tokenFor(second))).status, 403);
  });
  await t.test('creación concurrente conserva una sola invitación pendiente', async () => {
   const results = await Promise.all([call(`/projects/${project.id}/invitations`, 'POST', { email: concurrentInvite.email }, ownerToken), call(`/projects/${project.id}/invitations`, 'POST', { email: concurrentInvite.email }, ownerToken)]);
   assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
   rejectInvitation = results.find(result => result.status === 201).data;
   assert.equal(await temp.projectInvitation.count({ where: { projectId: project.id, invitedUserId: concurrentInvite.id, status: 'PENDING' } }), 1);
  });
  await t.test('usuario invitado rechaza y el token no se reutiliza', async () => {
   const token = await tokenFor(concurrentInvite); const result = await call(`/invitations/${rejectInvitation.token}/reject`, 'POST', undefined, token); assert.equal(result.status, 201); assert.equal(result.data.status, 'REJECTED');
   assert.equal((await call(`/invitations/${rejectInvitation.token}`, 'GET', undefined, token)).status, 409);
   assert.equal((await call(`/invitations/${rejectInvitation.token}/reject`, 'POST', undefined, token)).status, 409);
  });
  await t.test('invitación expirada se marca y rechaza', async () => {
   const row = await temp.projectInvitation.findFirstOrThrow({ where: { invitedUserId: second.id } }); await temp.projectInvitation.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
   const result = await call(`/invitations/${secondInvitation.token}`, 'GET', undefined, await tokenFor(second)); assert.equal(result.status, 409); assert.equal(result.data.message, 'La invitación expiró');
   assert.equal((await temp.projectInvitation.findUniqueOrThrow({ where: { id: row.id } })).status, 'EXPIRED');
  });
  await t.test('invitado acepta, crea membresía, marca ACCEPTED y no reutiliza token', async () => {
   const result = await call(`/invitations/${invitation.token}/accept`, 'POST', undefined, collaboratorToken); assert.equal(result.status, 201); assert.equal(result.data.userId, collaborator.id); assert.equal(result.data.user.role.name, 'COLABORADOR');
   assert.equal(await temp.projectMember.count({ where: { projectId: project.id, userId: collaborator.id } }), 1);
   const row = await temp.projectInvitation.findUniqueOrThrow({ where: { id: invitation.invitation.id } }); assert.equal(row.status, 'ACCEPTED'); assert.ok(row.acceptedAt);
   assert.equal((await call(`/invitations/${invitation.token}/accept`, 'POST', undefined, collaboratorToken)).status, 409);
   assert.equal((await call(`/projects/${project.id}/invitations`, 'POST', { email: collaborator.email }, ownerToken)).status, 409);
  });
  await t.test('aceptación concurrente crea una sola membresía', async () => {
   const created = (await call(`/projects/${project.id}/invitations`, 'POST', { email: concurrent.email }, ownerToken)).data; const token = await tokenFor(concurrent);
   const results = await Promise.all([call(`/invitations/${created.token}/accept`, 'POST', undefined, token), call(`/invitations/${created.token}/accept`, 'POST', undefined, token)]);
   assert.deepEqual(results.map(result => result.status).sort(), [201, 409]); assert.equal(await temp.projectMember.count({ where: { projectId: project.id, userId: concurrent.id } }), 1);
  });
  await t.test('propietario lista y retira participante, pero no puede retirarse', async () => {
   const list = await call(`/projects/${project.id}/participants`, 'GET', undefined, ownerToken); assert.equal(list.status, 200); assert.equal(list.data.length, 2); assert.equal(list.data.some(item => item.user.email === collaborator.email), true);
   assert.equal((await call(`/projects/${project.id}/participants/${owner.id}`, 'DELETE', undefined, ownerToken)).status, 409);
   assert.equal((await call(`/projects/${project.id}/participants/${collaborator.id}`, 'DELETE', undefined, ownerToken)).status, 200);
   assert.equal(await temp.projectMember.count({ where: { projectId: project.id, userId: collaborator.id } }), 0);
   assert.equal((await call(`/projects/${project.id}/participants/${collaborator.id}`, 'DELETE', undefined, ownerToken)).status, 404);
  });
  await t.test('otro anfitrión y colaborador no administran; sin token recibe 401', async () => {
   for (const token of [otherToken, collaboratorToken]) {
    assert.equal((await call(`/projects/${project.id}/participants`, 'GET', undefined, token)).status, 403);
    assert.equal((await call(`/projects/${project.id}/invitations`, 'POST', { email: second.email }, token)).status, 403);
   }
   assert.equal((await call(`/projects/${project.id}/participants`)).status, 401);
   assert.equal((await call(`/projects/${project.id}/invitations`)).status, 401);
  });
  await t.test('proyectos compartidos refleja membresía sin permitir administración', async () => {
   const token = await tokenFor(concurrent); const shared = await call('/shared-projects', 'GET', undefined, token); assert.equal(shared.status, 200); assert.equal(shared.data.length, 1); assert.equal(shared.data[0].project.id, project.id);
   assert.equal((await call('/shared-projects', 'GET', undefined, ownerToken)).status, 403);
  });
 } finally { if (app) await app.close(); if (temp) await temp.$disconnect(); process.env.DATABASE_URL = originalUrl; await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect(); }
});
