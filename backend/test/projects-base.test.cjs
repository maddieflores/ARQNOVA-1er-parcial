const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
require('reflect-metadata');
process.loadEnvFile('.env');
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');

test('Fase 2A persiste proyectos, participantes e invitaciones en un esquema aislado', async t => {
  const schema = `arqnova_test_${randomUUID().replaceAll('-', '')}`;
  const root = new PrismaClient(); let temp; let app;
  const originalUrl = process.env.DATABASE_URL;
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const url = new URL(originalUrl); url.searchParams.set('schema', schema);
    process.env.DATABASE_URL = url.toString();
    temp = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    const migrations = fs.readdirSync('prisma/migrations').sort();
    for (const directory of migrations) {
      const path = `prisma/migrations/${directory}/migration.sql`;
      if (!fs.existsSync(path)) continue;
      const sql = fs.readFileSync(path, 'utf8');
      for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await temp.$executeRawUnsafe(statement);
    }
    const roles = {};
    for (const name of ['ADMINISTRADOR', 'ANFITRION', 'COLABORADOR']) roles[name] = await temp.role.create({ data: { name } });
    const passwordHash = '$2b$12$test.only.hash.is.not.used.for.authentication';
    const user = (name, role, active = true) => temp.user.create({ data: { name, email: `${randomUUID()}@example.test`, passwordHash, roleId: roles[role].id, isActive: active } });
    const owner = await user('Anfitrión', 'ANFITRION');
    const secondHost = await user('Otro anfitrión', 'ANFITRION');
    const collaborator = await user('Colaborador', 'COLABORADOR');
    const outsider = await user('Sin acceso', 'COLABORADOR');
    const inactive = await user('Inactivo', 'COLABORADOR', false);
    const { AppModule } = require('../dist/app.module');
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const { ProjectsService } = require('../dist/projects/projects.service');
    const { ParticipantsService } = require('../dist/participants/participants.service');
    const { InvitationsService } = require('../dist/invitations/invitations.service');
    const projects = app.get(ProjectsService); const participants = app.get(ParticipantsService); const invitations = app.get(InvitationsService);
    let project;
    await t.test('crea, asocia, consulta, lista y actualiza un proyecto de anfitrión', async () => {
      project = await projects.create(owner.id, { name: '  Modelo académico  ', description: 'Base UML' });
      assert.equal(project.name, 'Modelo académico'); assert.equal(project.ownerId, owner.id);
      assert.equal((await projects.findById(project.id)).id, project.id);
      assert.equal((await projects.listByOwner(owner.id)).length, 1);
      assert.equal((await projects.update(project.id, owner.id, { name: 'Modelo actualizado' })).name, 'Modelo actualizado');
    });
    await t.test('rechaza propietario inexistente, no anfitrión e inactivo', async () => {
      await assert.rejects(projects.create(randomUUID(), { name: 'Inválido' }), error => error.getStatus() === 404);
      await assert.rejects(projects.create(collaborator.id, { name: 'Inválido' }), error => error.getStatus() === 403);
      await assert.rejects(projects.create(inactive.id, { name: 'Inválido' }), error => error.getStatus() === 403);
    });
    await t.test('agrega y lista participante, evita duplicado y propietario', async () => {
      const member = await participants.add(project.id, owner.id, { userId: collaborator.id });
      assert.equal(member.userId, collaborator.id); assert.equal((await participants.list(project.id, owner.id)).length, 1);
      await assert.rejects(participants.add(project.id, owner.id, { userId: collaborator.id }), error => error.getStatus() === 409);
      await assert.rejects(participants.add(project.id, owner.id, { userId: owner.id }), error => error.getStatus() === 409);
      await assert.rejects(participants.add(project.id, owner.id, { userId: inactive.id }), error => error.getStatus() === 409);
    });
    await t.test('solo propietario administra y solo propietario/miembro acceden', async () => {
      await assert.rejects(participants.list(project.id, secondHost.id), error => error.getStatus() === 403);
      await assert.rejects(participants.add(project.id, secondHost.id, { userId: outsider.id }), error => error.getStatus() === 403);
      assert.equal(await participants.isMember(project.id, collaborator.id), true);
      assert.equal(await participants.isMember(project.id, outsider.id), false);
      await assert.rejects(projects.validateAccess(project.id, outsider.id), error => error.getStatus() === 403);
    });
    await t.test('crea token seguro, valida y acepta invitación vigente', async () => {
      const created = await invitations.create(project.id, owner.id, { invitedUserId: outsider.id });
      assert.ok(created.token.length >= 40); assert.equal(Object.hasOwn(created.invitation, 'tokenHash'), false);
      assert.equal((await invitations.validate(created.token, outsider.id)).id, created.invitation.id);
      await invitations.accept(created.token, outsider.id);
      assert.equal(await participants.isMember(project.id, outsider.id), true);
      await assert.rejects(invitations.validate(created.token, outsider.id), error => error.getStatus() === 409);
    });
    await t.test('rechaza token ajeno, inválido e invitación expirada', async () => {
      const invited = await user('Invitado adicional', 'COLABORADOR');
      const created = await invitations.create(project.id, owner.id, { invitedUserId: invited.id });
      await assert.rejects(invitations.validate(created.token, collaborator.id), error => error.getStatus() === 403);
      await assert.rejects(invitations.findByToken(randomBytes(32).toString('base64url')), error => error.getStatus() === 404);
      await temp.projectInvitation.update({ where: { id: created.invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await assert.rejects(invitations.validate(created.token, invited.id), error => error.getStatus() === 409);
      assert.equal((await temp.projectInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).status, 'EXPIRED');
    });
    await t.test('borrado lógico oculta proyecto sin eliminarlo físicamente', async () => {
      await projects.remove(project.id, owner.id);
      await assert.rejects(projects.findById(project.id), error => error.getStatus() === 404);
      assert.ok((await temp.project.findUniqueOrThrow({ where: { id: project.id } })).deletedAt);
    });
  } finally {
    if (app) await app.close(); if (temp) await temp.$disconnect();
    process.env.DATABASE_URL = originalUrl;
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect();
  }
});
