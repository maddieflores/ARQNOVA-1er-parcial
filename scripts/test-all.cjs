const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
const children = [];

function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} finalizó con código ${code}`)));
  });
}

function runNpm(args) {
  if (!npmCli) throw new Error('No se pudo localizar npm; ejecuta este flujo mediante npm run test:all');
  return run(process.execPath, [npmCli, ...args]);
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env });
  children.push(child);
  return child;
}

async function waitFor(url, label, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} no respondió en ${url}`);
}

async function stopChildren() {
  for (const child of children.reverse()) {
    if (!child.killed) child.kill('SIGTERM');
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}

(async () => {
  try {
    console.log('\n[1/5] Regresión backend');
    await runNpm(['run', 'test:all', '--prefix', 'backend']);
    console.log('\n[2/5] Build frontend');
    await runNpm(['run', 'build', '--prefix', 'frontend']);
    console.log('\n[3/5] Preparación de base de datos');
    await runNpm(['run', 'prisma:migrate:deploy', '--prefix', 'backend']);
    await runNpm(['run', 'prisma:seed', '--prefix', 'backend']);
    console.log('\n[4/5] Inicio temporal de backend y frontend');
    start(process.execPath, ['dist/main.js'], path.join(root, 'backend'));
    await waitFor('http://localhost:3000/api/health', 'Backend');
    start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], path.join(root, 'frontend'));
    await waitFor('http://localhost:5173', 'Frontend');
    console.log('\n[5/5] Regresión Playwright');
    await runNpm(['run', 'test:all', '--prefix', 'frontend']);
    console.log('\nRegresión completa aprobada.');
  } catch (error) {
    console.error(`\nRegresión detenida: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await stopChildren();
  }
})();
