const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs'); const path = require('node:path');
process.loadEnvFile(path.resolve('../backend/.env')); process.loadEnvFile(path.resolve('.env'));
const temp = path.resolve('../.verification/browser-temp'); fs.mkdirSync(temp, { recursive: true }); process.env.TEMP = temp; process.env.TMP = temp;
const { chromium } = require('playwright');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const API = process.env.VITE_API_URL; const WEB = process.env.CORS_ORIGIN;
const privateValues = [process.env.ADMIN_PASSWORD, process.env.JWT_SECRET];
(async () => {
 const prisma = new PrismaClient(); let browser; const ids = [];
 try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const login = async (email, password) => {
   await page.goto(`${WEB}/login`); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Contraseña', { exact: true }).fill(password);
   await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL(`${WEB}/dashboard`); await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  };
  const logout = async () => { await page.goto(`${WEB}/dashboard`); await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await page.waitForURL(`${WEB}/login`); };
  await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  await page.getByRole('link', { name: 'Gestión de usuarios', exact: true }).click(); await page.getByRole('heading', { name: 'Gestión de usuarios', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
  const input = { name: `CU02-${randomUUID().slice(0, 8)}`, email: `${randomUUID()}@example.test`, password: randomBytes(24).toString('hex') }; privateValues.push(input.password);
  await page.getByLabel('Nombre', { exact: true }).fill(input.name); await page.getByLabel('Email', { exact: true }).fill(input.email); await page.getByLabel('Contraseña', { exact: true }).fill(input.password); await page.getByLabel('Rol', { exact: true }).selectOption({ label: 'COLABORADOR' });
  const creation = page.waitForResponse(response => response.url() === `${API}/users` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click(); const createdResponse = await creation; assert.equal(createdResponse.status(), 201);
  const created = await createdResponse.json(); ids.push(created.id); assert.equal(Object.hasOwn(created, 'passwordHash'), false);
  const row = () => page.getByRole('listitem').filter({ hasText: input.email });
  await row().getByRole('heading', { name: input.name, exact: true }).waitFor();
  console.log('Administrador lista y crea usuario desde interfaz responsive.');
  await row().getByRole('button', { name: 'Editar', exact: true }).click(); assert.equal(await page.getByLabel('Contraseña', { exact: true }).count(), 0);
  await page.getByLabel('Nombre', { exact: true }).fill('Usuario CU02 editado'); await page.getByLabel('Rol', { exact: true }).selectOption({ label: 'ANFITRION' });
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click(); await row().getByText('ANFITRION · Activo', { exact: true }).waitFor();
  await row().getByRole('heading', { name: 'Usuario CU02 editado', exact: true }).waitFor();
  await row().getByRole('button', { name: 'Editar', exact: true }).click(); await page.getByLabel('Email', { exact: true }).fill(process.env.ADMIN_EMAIL);
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'El email ya está registrado' }).waitFor();
  await page.getByLabel('Email', { exact: true }).fill(input.email); await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await page.getByRole('heading', { name: 'Editar usuario', exact: true }).waitFor({ state: 'hidden' });
  console.log('Edición y rol funcionan; contraseña no se precarga; email duplicado visible.');
  await row().getByRole('button', { name: 'Desactivar', exact: true }).click(); await row().getByText('ANFITRION · Inactivo', { exact: true }).waitFor();
  await row().getByRole('button', { name: 'Activar', exact: true }).click(); await row().getByText('ANFITRION · Activo', { exact: true }).waitFor();
  console.log('Activación/desactivación con confirmación y estado actualizado.');
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  await page.route(`${API}/users/${admin.id}/status`, route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'No se puede desactivar ni cambiar el rol del último administrador activo' }) }));
  await page.getByRole('listitem').filter({ hasText: process.env.ADMIN_EMAIL }).getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'último administrador activo' }).waitFor(); await page.unroute(`${API}/users/${admin.id}/status`);
  console.log('Mensaje del último administrador visible (respuesta simulada; regla real probada en esquema aislado).');
  await page.getByLabel('Buscar usuarios').fill(randomUUID()); await page.getByRole('button', { name: 'Buscar', exact: true }).click(); await page.getByText('No hay usuarios para mostrar.', { exact: true }).waitFor();
  await page.getByLabel('Buscar usuarios').fill(''); await page.getByRole('button', { name: 'Buscar', exact: true }).click(); await row().waitFor();
  await logout();
  for (const name of ['ANFITRION', 'COLABORADOR']) {
   const role = await prisma.role.findUniqueOrThrow({ where: { name } }); await prisma.user.update({ where: { id: created.id }, data: { roleId: role.id } });
   await login(input.email, input.password); assert.equal(await page.getByRole('link', { name: 'Gestión de usuarios', exact: true }).count(), 0);
   await page.goto(`${WEB}/admin/users`); await page.getByRole('heading', { name: 'Acceso no autorizado', exact: true }).waitFor();
   await logout();
  }
  console.log('ANFITRION/COLABORADOR sin navegación administrativa y con acceso manual bloqueado.');
  await page.goto(`${WEB}/admin/users`); await page.waitForURL(`${WEB}/login`);
  assert.deepEqual(errors, []); console.log('Logout/login y protección sin sesión OK; cero errores JavaScript.');
 } finally {
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); if (browser) await browser.close();
 }
})().catch(error => { let message = error.message; for (const value of privateValues.filter(Boolean)) message = message.split(value).join('[REDACTADO]'); console.error('Prueba CU02 falló:', message); process.exitCode = 1; });
