const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
require('reflect-metadata');
process.loadEnvFile('.env');
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');

test('Fase 3A persiste e integra el modelo UML en un esquema aislado', async t => {
  const schema = `arqnova_test_${randomUUID().replaceAll('-', '')}`;
  const root = new PrismaClient(); let temp; let app;
  const originalUrl = process.env.DATABASE_URL;
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const url = new URL(originalUrl); url.searchParams.set('schema', schema); process.env.DATABASE_URL = url.toString();
    temp = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    for (const directory of fs.readdirSync('prisma/migrations').sort()) {
      const path = `prisma/migrations/${directory}/migration.sql`;
      if (fs.existsSync(path)) for (const sql of fs.readFileSync(path, 'utf8').split(';').map(value => value.trim()).filter(Boolean)) await temp.$executeRawUnsafe(sql);
    }
    const hostRole = await temp.role.create({ data: { name: 'ANFITRION' } });
    const memberRole = await temp.role.create({ data: { name: 'COLABORADOR' } });
    const user = (name, roleId) => temp.user.create({ data: { name, email: `${randomUUID()}@example.test`, passwordHash: 'hash-de-prueba', roleId } });
    const owner = await user('Anfitrión', hostRole.id); const member = await user('Colaborador', memberRole.id); const outsider = await user('Sin acceso', memberRole.id);
    const project = await temp.project.create({ data: { name: 'Proyecto UML', ownerId: owner.id, members: { create: { userId: member.id } } } });
    const otherProject = await temp.project.create({ data: { name: 'Otro proyecto', ownerId: owner.id } });
    const { AppModule } = require('../dist/app.module'); app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const { DiagramsService } = require('../dist/uml/diagrams.service');
    const { UmlClassesService } = require('../dist/uml/uml-classes.service');
    const { UmlAttributesService } = require('../dist/uml/uml-attributes.service');
    const { UmlMethodsService } = require('../dist/uml/uml-methods.service');
    const { UmlRelationsService } = require('../dist/uml/uml-relations.service');
    const diagrams = app.get(DiagramsService); const classes = app.get(UmlClassesService); const attributes = app.get(UmlAttributesService); const methods = app.get(UmlMethodsService); const relations = app.get(UmlRelationsService);
    let diagram; let source; let target; let relation;

    await t.test('crea un único diagrama para proyecto válido y permite acceso a un miembro', async () => {
      diagram = await diagrams.create(project.id, owner.id, { name: 'Diagrama principal' });
      assert.equal(diagram.projectId, project.id); assert.deepEqual(diagram.classes, []);
      assert.equal((await diagrams.getByProject(project.id, member.id)).id, diagram.id);
      await assert.rejects(diagrams.create(project.id, owner.id, { name: 'Duplicado' }), error => error.getStatus() === 409);
    });
    await t.test('rechaza proyecto inexistente y usuario sin acceso', async () => {
      await assert.rejects(diagrams.create(randomUUID(), owner.id, { name: 'Inválido' }), error => error.getStatus() === 404);
      await assert.rejects(diagrams.getByProject(project.id, outsider.id), error => error.getStatus() === 403);
    });
    await t.test('crea clases y persiste el movimiento x/y', async () => {
      source = await classes.create(diagram.id, owner.id, { name: 'Usuario', x: 25.5, y: -10 });
      target = await classes.create(diagram.id, member.id, { name: 'Rol', x: 300, y: 40, isAbstract: true });
      assert.equal(source.x, 25.5); assert.equal(source.y, -10);
      const moved = await classes.move(source.id, owner.id, { x: 100, y: 200 });
      assert.equal(moved.x, 100); assert.equal(moved.y, 200);
    });
    await t.test('crea y lista atributos y métodos asociados', async () => {
      const attribute = await attributes.create(source.id, owner.id, { name: 'id', type: 'Long', visibility: 'PRIVATE', isPrimaryKey: true });
      const method = await methods.create(source.id, owner.id, { name: 'guardar', returnType: 'void', visibility: 'PUBLIC' });
      assert.equal(attribute.umlClassId, source.id); assert.equal(method.umlClassId, source.id);
      assert.equal((await attributes.list(source.id, member.id)).length, 1); assert.equal((await methods.list(source.id, member.id)).length, 1);
    });
    await t.test('crea relación válida y rechaza extremos inexistentes o de otro diagrama', async () => {
      relation = await relations.create(diagram.id, owner.id, { sourceClassId: source.id, targetClassId: target.id, type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '0..*' });
      assert.equal(relation.diagramId, diagram.id);
      await assert.rejects(relations.create(diagram.id, owner.id, { sourceClassId: source.id, targetClassId: randomUUID(), type: 'DEPENDENCY' }), error => error.getStatus() === 404);
      const secondDiagram = await diagrams.create(otherProject.id, owner.id, { name: 'Segundo' });
      const foreign = await classes.create(secondDiagram.id, owner.id, { name: 'Externa', x: 0, y: 0 });
      await assert.rejects(relations.create(diagram.id, owner.id, { sourceClassId: source.id, targetClassId: foreign.id, type: 'DEPENDENCY' }), error => error.getStatus() === 400);
    });
    await t.test('carga estructura completa y conserva orden y asociaciones', async () => {
      const loaded = await diagrams.getByProject(project.id, owner.id);
      assert.equal(loaded.classes.length, 2); assert.equal(loaded.relations.length, 1);
      assert.equal(loaded.classes.find(item => item.id === source.id).attributes[0].name, 'id');
      assert.equal(loaded.classes.find(item => item.id === source.id).methods[0].name, 'guardar');
    });
    await t.test('eliminar clase limpia atributos, métodos y relaciones en transacción', async () => {
      await classes.remove(source.id, owner.id);
      assert.equal(await temp.umlClass.count({ where: { id: source.id } }), 0);
      assert.equal(await temp.umlAttribute.count({ where: { umlClassId: source.id } }), 0);
      assert.equal(await temp.umlMethod.count({ where: { umlClassId: source.id } }), 0);
      assert.equal(await temp.umlRelation.count({ where: { id: relation.id } }), 0);
    });
  } finally {
    if (app) await app.close(); if (temp) await temp.$disconnect(); process.env.DATABASE_URL = originalUrl;
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect();
  }
});
