# Fase 1 — Cierre técnico

Fecha de cierre: 2026-09-19. Rama: `fase-1`.

La Fase 1 entrega CU01 Gestionar autenticación y CU02 Gestionar usuarios, roles y permisos. No incluye proyectos, participantes, UML, colaboración funcional, IA, XMI, generación de software ni aplicación móvil.

## Trazabilidad

| Caso de uso | Backend | Frontend | Seguridad |
| --- | --- | --- | --- |
| CU01 Gestionar autenticación | `AuthController`, `AuthService`, `JwtAuthGuard`, `POST /api/auth/login`, `GET /api/auth/me` | `/login`, `AuthProvider`, almacenamiento centralizado, `ProtectedRoute`, dashboard y logout | bcrypt, JWT HS256 desde entorno, usuario activo consultado en PostgreSQL, respuesta sin `passwordHash` |
| CU02 Gestionar usuarios, roles y permisos | `UsersController`, `RolesController`, `UsersService`, `RolesGuard`, `@Roles` | `/admin/users`, `AdminRoute`, formularios y servicios administrativos | autenticación antes de autorización, ADMINISTRADOR exclusivo, protección transaccional del último administrador |

## Autenticación y sesión

El login normaliza email, compara la contraseña con bcrypt y devuelve un JWT con `sub`, `email`, `role`, `iat` y `exp`. `JWT_SECRET` y `JWT_EXPIRES_IN` se leen mediante `ConfigModule`; solo se acepta HS256. Una comparación bcrypt de relleno evita que el tiempo de respuesta indique si un email existe o si una cuenta está inactiva. Los errores de credenciales usan el mismo 401 genérico.

`JwtAuthGuard` extrae `Authorization: Bearer <token>`, valida firma/expiración y carga el usuario actual. Un usuario eliminado o inactivo queda rechazado aunque conserve un token anterior. `/auth/me` devuelve exclusivamente datos públicos.

El frontend guarda solamente el token en `localStorage`, bajo la clave `arqnova.auth.token`. `AuthProvider` recupera la sesión mediante `/auth/me`, limpia estado ante 401 y conserva el token ante fallas transitorias de red para permitir reintento. Logout elimina la sesión local. No existen refresh tokens ni blacklist en esta fase.

## Usuarios, roles y autorización

Los roles iniciales son `ADMINISTRADOR`, `ANFITRION` y `COLABORADOR`. Solo ADMINISTRADOR accede a:

- `GET /api/users` y búsqueda opcional por nombre/email;
- `GET /api/users/:id`;
- `POST /api/users`;
- `PATCH /api/users/:id`;
- `PATCH /api/users/:id/status`;
- `GET /api/roles`.

Los controladores aplican `@UseGuards(JwtAuthGuard, RolesGuard)` en ese orden y `@Roles(ADMINISTRADOR)`. Sin autenticación se responde 401; con ANFITRION o COLABORADOR, 403. La interfaz oculta la navegación administrativa, pero la protección real permanece en backend.

Las respuestas reutilizan `PUBLIC_USER_SELECT` y nunca incluyen `passwordHash`. La creación valida email/rol, aplica bcrypt e inicia activa por defecto. La edición no acepta contraseña ni elimina usuarios físicamente. Errores esperados se traducen a 400/404/409 sin exponer detalles Prisma.

El último ADMINISTRADOR activo no puede desactivarse ni cambiar de rol. `UsersService.update` serializa cambios de rol/estado con una transacción y bloqueo asesor PostgreSQL antes de contar administradores activos, por lo que solicitudes concurrentes tampoco pueden dejar el sistema sin uno.

## Variables y puesta en marcha

Los `.env` reales están ignorados. `backend/.env.example` documenta:

- `DATABASE_URL` con PostgreSQL local en `localhost:5433`;
- `CORS_ORIGIN=http://localhost:5173`;
- `JWT_SECRET` sin valor y generado localmente;
- `JWT_EXPIRES_IN` en segundos;
- `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` para el seed.

El CORS central permite únicamente el origen configurado. Ninguna variable `VITE_*` contiene secretos.

```powershell
docker compose up -d

Set-Location backend
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run prisma:seed
npm run start:dev

# En otra terminal
Set-Location frontend
npm run dev
```

El seed es de desarrollo, idempotente y transaccional. No sobrescribe una cuenta existente ni cambia su contraseña. Rechaza producción y una cuenta inicial no administradora o inactiva.

## Validación final ejecutada

- Backend build: correcto.
- Frontend build: correcto, 88 módulos Vite.
- Prisma `format`, `validate`, `generate` y `migrate status`: correctos; una migración aplicada y base sincronizada.
- Seed ejecutado dos veces: tres roles únicos y administrador activo conservado; contraseña bcrypt válida y distinta del texto original.
- Backend: 5 pruebas de Fase 1A, 8 casos CU01 y 11 casos CU02; cero fallos.
- Frontend Chrome: regresiones CU01 y CU02 completas; cero errores JavaScript/React.
- Health: `{"status":"ok","service":"arqnova-api"}`.
- Socket.IO `/collaboration`: conexiones y desconexiones registradas correctamente.
- PostgreSQL Docker 17: `healthy`, publicado en 5433 y persistente.
- Auditorías npm backend/frontend: cero vulnerabilidades.
- Secretos y archivos ignorados: comprobados; ningún `.env` real está registrado.

Los tests CU02 usan un esquema PostgreSQL temporal aislado y lo eliminan al finalizar. Las pruebas de navegador eliminan exclusivamente sus usuarios temporales.

## Documentación relacionada

- [Base de seguridad](SECURITY_PHASE_1A.md)
- [Autenticación](AUTH_PHASE_1B.md)
- [Usuarios y autorización](USERS_PHASE_1C.md)
- [Desarrollo](DEVELOPMENT.md)

No continuar a otra fase sin autorización.
