# ARQNOVA — Fases 0, 1 y 2

Plataforma CASE web colaborativa inteligente para modelado UML y generación automática de software. Actualmente incluye CU01 Autenticación, CU02 Administración de usuarios, CU03 Gestión de proyectos UML y CU04 Gestión de participantes e invitaciones.

## Tecnologías y requisitos

React, Vite, TypeScript, Tailwind CSS 4, React Flow; NestJS 12, Prisma 6.12, JWT, bcrypt y Socket.IO; PostgreSQL 17 mediante Docker Compose. NestJS es el backend de ARQNOVA. Java + Spring Boot será el backend generado en una fase futura.

Instalar Node.js 22.19 o superior compatible, npm y Docker Desktop con contenedores Linux. Iniciar Docker Desktop antes de levantar PostgreSQL. No se necesita Flutter ni Java para esta fase.

## Configuración inicial (PowerShell)

Desde C:\Proyectos\ARQNOVA, copiar los ejemplos solo si no existen archivos .env:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Editar .env y elegir una contraseña local de PostgreSQL. En backend/.env, usar esa misma contraseña en DATABASE_URL (codificar caracteres especiales como URL). Configurar JWT_SECRET con un valor aleatorio local de al menos 32 caracteres. Para el seed de Fase 1A, definir también ADMIN_* según docs/SECURITY_PHASE_1A.md. Los .env están ignorados; los ejemplos contienen únicamente marcadores. Ningún secreto backend debe llevar prefijo VITE_, porque las variables VITE_ son públicas.

- Raíz: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB para Compose.
- Backend: DATABASE_URL, PORT=3000, CORS_ORIGIN=http://localhost:5173, JWT_SECRET y JWT_EXPIRES_IN.
- Frontend: VITE_API_URL=http://localhost:3000/api, VITE_SOCKET_URL=http://localhost:3000.

## PostgreSQL, dependencias y migraciones

```powershell
docker compose config --quiet
docker compose up -d
npm ci --prefix backend
npm ci --prefix frontend
Set-Location backend
npx prisma validate
npx prisma generate
npx prisma migrate dev
Set-Location ..
```

Las migraciones versionadas crean `User`, `Role`, `Project`, `ProjectMember` y `ProjectInvitation`. El seed crea los tres roles y el administrador mediante variables locales; ver docs/SECURITY_PHASE_1A.md. En una copia nueva, `migrate dev` aplica todo el historial. No usar `db push` como sustituto de las migraciones.

## Ejecutar en dos terminales

Backend, desde la raíz:

```powershell
Set-Location backend
npm run start:dev
```

Frontend, en otra terminal desde la raíz:

```powershell
Set-Location frontend
npm run dev
```

- Web: http://localhost:5173
- Login: http://localhost:5173/login
- Dashboard protegido: http://localhost:5173/dashboard
- Proyectos del anfitrión: http://localhost:5173/projects
- Proyectos compartidos: http://localhost:5173/shared-projects
- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health
- Socket.IO: namespace /collaboration en http://localhost:3000 (no /api/collaboration).
- PostgreSQL: localhost:5433 (5432 interno del contenedor).

No se cambian puertos automáticamente; Vite usa strictPort. Si hay un puerto ocupado, resolverlo antes de continuar. El backend requiere PostgreSQL accesible para iniciar.

## Verificación

```powershell
npm run build --prefix frontend
npm run build --prefix backend
Set-Location backend
npx prisma validate
npx prisma migrate status
Set-Location ..
docker compose config --quiet
Invoke-RestMethod http://localhost:3000/api/health
```

Health debe devolver status=ok y service=arqnova-api. Abrir inicio o dashboard tras iniciar sesión y verificar el mismo resultado y Servidor realtime: conectado. Al cerrar la página, NestJS registra Cliente desconectado. Visitar una ruta inexistente para comprobar 404. La interfaz usa utilidades Tailwind; React Flow está instalado y sus estilos cargados, sin editor UML.

docker compose down detiene PostgreSQL y conserva el volumen. No utilizar down -v si se desea conservar los datos. Cambiar POSTGRES_PASSWORD después de inicializar el volumen no cambia automáticamente la contraseña almacenada en PostgreSQL.

## Documentación

Ver docs/PROJECT_CONTEXT.md, docs/ARCHITECTURE.md, docs/DEVELOPMENT.md, docs/PHASES.md y los resúmenes técnicos por fase. `mobile` continúa reservado para Flutter.



## Fase 1A — Base de seguridad

La base de Fase 0 se conserva. Se agregan servicios internos de usuarios/roles, DTOs, bcrypt, configuración JWT y seed idempotente de desarrollo. No hay login ni endpoints CRUD. Seguir [docs/SECURITY_PHASE_1A.md](docs/SECURITY_PHASE_1A.md) para configurar JWT_SECRET, JWT_EXPIRES_IN y ADMIN_* antes de ejecutar el seed:

```powershell
Set-Location backend
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
npm run test:security
```

## Fase 1B — Autenticación

POST /api/auth/login y GET /api/auth/me implementan CU01. Abrir /login con ADMIN_EMAIL y ADMIN_PASSWORD configurados localmente; el dashboard requiere autenticación y permite cerrar sesión. La sesión guarda únicamente el JWT en localStorage y se verifica con /auth/me al recargar. Ver [docs/AUTH_PHASE_1B.md](docs/AUTH_PHASE_1B.md) para endpoints, sesión y pruebas.

Desde backend: `npm run test:auth`. Desde frontend, con ambos servidores activos y Chrome instalado: `npm run test:auth`.

## Fase 1C — Gestión de usuarios

Entrar como ADMINISTRADOR y abrir /admin/users. Permite listar, buscar, crear, editar, asignar roles y activar/desactivar. No hay registro público, eliminación física ni cambios de contraseña por edición. ANFITRION/COLABORADOR tienen acceso administrativo bloqueado en frontend y backend. Se protege al último administrador activo incluso ante solicitudes concurrentes.

Consultar [docs/USERS_PHASE_1C.md](docs/USERS_PHASE_1C.md). Pruebas: npm run test:users en backend y frontend; el navegador requiere ambos servidores activos.

## Cierre de Fase 1

La trazabilidad de CU01/CU02, arquitectura de seguridad, variables, endpoints y resultados finales está en [docs/PHASE_1_SUMMARY.md](docs/PHASE_1_SUMMARY.md).

```powershell
# Backend
npm run test:security
npm run test:auth
npm run test:users

# Frontend, con ambos servidores activos
npm run test:auth
npm run test:users
```

## Fase 2 — Proyectos y participantes

El rol `ANFITRION` gestiona sus proyectos desde `/projects` y sus participantes desde el detalle de cada proyecto. El propietario proviene del JWT y el borrado es lógico. Las invitaciones se crean para usuarios registrados, almacenan únicamente el hash del token y se aceptan desde `/invitations/:token`. El rol `COLABORADOR` consulta sus membresías en `/shared-projects`.

Consultar [docs/PHASE_2_SUMMARY.md](docs/PHASE_2_SUMMARY.md), [docs/PROJECTS_BASE_PHASE_2A.md](docs/PROJECTS_BASE_PHASE_2A.md), [docs/PROJECTS_PHASE_2B.md](docs/PROJECTS_PHASE_2B.md) y [docs/PARTICIPANTS_PHASE_2C.md](docs/PARTICIPANTS_PHASE_2C.md).

```powershell
# Backend
npm run test:projects-base
npm run test:projects
npm run test:participants

# Frontend, con backend y frontend activos
npm run test:projects
npm run test:participants
```

No iniciar una fase posterior sin autorización.
