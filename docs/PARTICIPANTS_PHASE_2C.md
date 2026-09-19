# Participantes e invitaciones — Fase 2C

La Fase 2C implementa CU04 sin incorporar editor UML ni colaboración en tiempo real.

## Endpoints

Administración exclusiva del propietario `ANFITRION`:

- `GET /api/projects/:projectId/participants`
- `DELETE /api/projects/:projectId/participants/:userId`
- `POST /api/projects/:projectId/invitations`
- `GET /api/projects/:projectId/invitations`

Operaciones del usuario invitado autenticado:

- `GET /api/invitations/:token`
- `POST /api/invitations/:token/accept`
- `POST /api/invitations/:token/reject`

Consulta mínima para `COLABORADOR`:

- `GET /api/shared-projects`

## Invitaciones

La UI recibe el email de una cuenta registrada y el backend resuelve su `User`. El token contiene 32 bytes aleatorios codificados en base64url. Solo se devuelve al crear la invitación; PostgreSQL conserva exclusivamente su SHA-256. La vigencia predeterminada es siete días y nunca puede superar treinta días.

Los estados son `PENDING`, `ACCEPTED`, `REJECTED` y `EXPIRED`. Una invitación vencida se marca `EXPIRED` y responde `409`. No se admiten invitaciones al propietario, usuarios inactivos, miembros existentes ni duplicados pendientes vigentes.

## Aceptación y concurrencia

El JWT debe pertenecer a `invitedUserId`. La transacción crea `ProjectMember` y marca la invitación `ACCEPTED`. La restricción única `(projectId, userId)` y el manejo de `P2002` garantizan una sola membresía ante aceptaciones simultáneas. El token aceptado no puede reutilizarse.

## Autorización y retiro

`JwtAuthGuard` precede a `RolesGuard`. El rol `ANFITRION` y `ProjectsService.verifyOwner` protegen listados, invitaciones y retiros. Un anfitrión ajeno, colaborador o administrador no adquiere permisos administrativos. El propietario tiene acceso implícito y no puede retirarse como participante.

## Frontend

- `/projects/:id/participants`: participantes, retiro, invitación por email y estados de invitación.
- `/invitations/:token`: validación y aceptación por el usuario invitado.
- `/shared-projects`: comprobación mínima de membresías del colaborador, sin edición administrativa.

El enlace con token se muestra una sola vez tras crearlo y no aparece en el historial de invitaciones.

## Pruebas

`test:participants` verifica la matriz HTTP, expiración, autorización, respuestas seguras y aceptación concurrente en un esquema PostgreSQL aislado. La prueba de navegador del mismo nombre recorre invitación, aceptación, proyecto compartido y retiro. También se ejecutan las regresiones de Fases 0, 1, 2A y 2B, builds y validaciones Prisma.
