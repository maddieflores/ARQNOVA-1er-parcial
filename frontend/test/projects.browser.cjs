const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs'); const path = require('node:path');
process.loadEnvFile(path.resolve('../backend/.env')); process.loadEnvFile(path.resolve('.env'));
const tempDir = path.resolve('../.verification/browser-temp'); fs.mkdirSync(tempDir, { recursive: true }); process.env.TEMP = tempDir; process.env.TMP = tempDir;
const { chromium } = require('playwright');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const { PasswordService } = require('../../backend/dist/common/security/password.service');
const API = process.env.VITE_API_URL; const WEB = process.env.CORS_ORIGIN;
const privateValues = [process.env.ADMIN_PASSWORD, process.env.JWT_SECRET];

(async () => {
  const prisma = new PrismaClient(); let browser; const userIds = []; const projectIds = [];
  try {
    const roles = Object.fromEntries((await prisma.role.findMany()).map(role => [role.name, role.id]));
    const createUser = async role => {
      const password = randomBytes(24).toString('hex'); privateValues.push(password);
      const user = await prisma.user.create({ data: { name: `Prueba ${role}`, email: `${randomUUID()}@example.test`, passwordHash: await new PasswordService().hash(password), roleId: roles[role] } });
      userIds.push(user.id); return { ...user, password };
    };
    const host = await createUser('ANFITRION'); const collaborator = await createUser('COLABORADOR');
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
    page.on('dialog', dialog => dialog.accept());
    const login = async (email, password) => {
      await page.goto(`${WEB}/login`); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Contraseña', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL(`${WEB}/dashboard`);
    };
    const logout = async () => { await page.goto(`${WEB}/dashboard`); await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await page.waitForURL(`${WEB}/login`); };
    await login(host.email, host.password);
    await page.getByRole('link', { name: 'Proyectos', exact: true }).click(); await page.waitForURL(`${WEB}/projects`);
    await page.getByRole('heading', { name: 'Proyectos UML', exact: true }).waitFor(); await page.getByText('No hay proyectos para mostrar.', { exact: true }).waitFor();
    console.log('ANFITRION accede al listado vacío y ve navegación de proyectos.');
    await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
    const name = `Proyecto-${randomUUID().slice(0, 8)}`;
    await page.getByLabel('Nombre', { exact: true }).fill(name); await page.getByLabel('Descripción', { exact: true }).fill('Descripción de CU03');
    const creation = page.waitForResponse(response => response.url() === `${API}/projects` && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click(); const response = await creation; assert.equal(response.status(), 201);
    const project = await response.json(); projectIds.push(project.id); assert.equal(project.ownerId, host.id);
    const card = () => page.getByRole('listitem').filter({ hasText: name }); await card().waitFor();
    await page.getByRole('status').filter({ hasText: 'Proyecto creado correctamente.' }).waitFor();
    console.log('Creación persiste owner del JWT y actualiza el listado.');
    await card().getByRole('button', { name: 'Editar', exact: true }).click();
    const updated = `${name}-editado`; await page.getByLabel('Nombre', { exact: true }).fill(updated); await page.getByLabel('Descripción', { exact: true }).fill('Descripción actualizada');
    await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click(); await page.getByRole('heading', { name: updated, exact: true }).waitFor();
    await page.getByRole('status').filter({ hasText: 'Proyecto actualizado correctamente.' }).waitFor();
    console.log('Edición de nombre y descripción funciona.');
    await page.getByRole('listitem').filter({ hasText: updated }).getByRole('link', { name: 'Abrir', exact: true }).click(); await page.waitForURL(`${WEB}/projects/${project.id}`);
    await page.getByRole('heading', { name: updated, exact: true }).waitFor(); await page.getByText(`Prueba ANFITRION (${host.email})`, { exact: true }).waitFor();
    await page.getByText('Editor UML disponible en una fase posterior.', { exact: true }).waitFor();
    console.log('Consulta muestra datos públicos y placeholder controlado.');
    await page.getByRole('link', { name: 'Volver a proyectos' }).click();
    await page.route(`${API}/projects/${project.id}`, route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'No autorizado' }) }));
    await page.getByRole('listitem').filter({ hasText: updated }).getByRole('button', { name: 'Editar', exact: true }).click(); await page.getByLabel('Nombre', { exact: true }).fill(`${updated}-fallo`);
    await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'No tienes permiso' }).waitFor();
    await page.unroute(`${API}/projects/${project.id}`); await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    console.log('Errores backend se muestran sin detalles internos.');
    await page.getByRole('listitem').filter({ hasText: updated }).getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByText('No hay proyectos para mostrar.', { exact: true }).waitFor(); await page.getByRole('status').filter({ hasText: 'Proyecto eliminado correctamente.' }).waitFor();
    assert.ok((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).deletedAt);
    console.log('Eliminación confirmada aplica borrado lógico y retira el proyecto del listado.');
    await logout();
    for (const account of [collaborator, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }]) {
      await login(account.email, account.password); assert.equal(await page.getByRole('link', { name: 'Proyectos', exact: true }).count(), 0);
      await page.goto(`${WEB}/projects`); await page.getByRole('heading', { name: 'Acceso no autorizado', exact: true }).waitFor(); await logout();
    }
    console.log('COLABORADOR y ADMINISTRADOR no ven acceso y la ruta manual se bloquea.');
    await page.goto(`${WEB}/projects`); await page.waitForURL(`${WEB}/login`);
    assert.deepEqual(errors, []); console.log('Login/logout, ruta sin sesión y consola JavaScript verificados.');
  } finally {
    if (projectIds.length) await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect(); if (browser) await browser.close();
  }
})().catch(error => { let message = error.message; for (const value of privateValues.filter(Boolean)) message = message.split(value).join('[REDACTADO]'); console.error('Prueba CU03 frontend falló:', message); process.exitCode = 1; });
