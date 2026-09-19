# Cierre técnico de Fase 2

La Fase 2 implementa CU03 Gestionar proyectos UML y CU04 Gestionar participantes del proyecto. No incluye editor UML ni colaboración en tiempo real.

## Trazabilidad

| Caso de uso | Persistencia | Backend | Frontend |
| --- | --- | --- | --- |
| CU03 Gestionar proyectos UML | `Project` | `ProjectsService`, `ProjectsController`, `/api/projects` | `/projects`, `/projects/:id` |
| CU04 Gestionar participantes del proyecto | `ProjectMember`, `ProjectInvitation` | `ParticipantsService`, `InvitationsService`, endpoints de participantes, invitaciones y proyectos compartidos | `/projects/:id/participants`, `/invitations/:token`, `/shared-projects` |

## Modelos e integridad

- `Project.ownerId` referencia obligatoriamente a `User`. Solo un `ANFITRION` activo puede crear proyectos mediante el servicio.
- `ProjectMember` tiene una restricción única sobre `(projectId, userId)`.
- `ProjectInvitation` referencia proyecto y usuario registrado, almacena `tokenHash` único, vencimiento y estado `PENDING`, `ACCEPTED`, `REJECTED` o `EXPIRED`.
- El borrado de proyectos usa `deletedAt`. Los proyectos eliminados dejan de aparecer en listados, accesos y proyectos compartidos sin destruir relaciones.

La migración `20260919204657_add_projects_participants_invitations` contiene los modelos de Fase 2. No fue necesaria otra migración en 2B, 2C o 2D.

## CU03: propiedad y autorización

Los endpoints `GET/POST /api/projects` y `GET/PATCH/DELETE /api/projects/:id` exigen JWT y rol `ANFITRION`. El backend toma `ownerId` del usuario autenticado y `ProjectsService.verifyOwner` impide consultar, modificar o eliminar proyectos ajenos. `COLABORADOR` y `ADMINISTRADOR` no reciben acceso implícito.

## CU04: participantes e invitaciones

El propietario lista y retira participantes y crea/lista invitaciones bajo `/api/projects/:projectId`. El usuario invitado consulta, acepta o rechaza mediante `/api/invitations/:token`. `GET /api/shared-projects` devuelve al colaborador únicamente sus membresías activas.

El token utiliza 32 bytes criptográficamente aleatorios en base64url. Se devuelve una sola vez y PostgreSQL conserva únicamente SHA-256. La vigencia predeterminada es siete días y el máximo es treinta. Una invitación vencida se marca `EXPIRED` y responde `409`.

La aceptación ocurre en una transacción. La restricción única de membresía y la traducción de `P2002` evitan duplicados. La creación de invitaciones serializa la comprobación y escritura con un bloqueo transaccional breve, por lo que dos solicitudes simultáneas dejan una sola invitación pendiente. Una invitación aceptada o rechazada no puede reutilizarse.

## Seguridad

Los guards se ejecutan en orden: autenticación y luego rol. La propiedad se comprueba en backend. Las respuestas usan selecciones Prisma explícitas y nunca incluyen `passwordHash` ni `tokenHash`. Los tokens no se registran en logs y no existen secretos versionados. Los errores externos mantienen `400`, `401`, `403`, `404` y `409` sin detalles internos de Prisma.

## Pruebas y regresión

- Backend: `test:security`, `test:auth`, `test:users`, `test:projects-base`, `test:projects` y `test:participants`.
- Frontend real: `test:auth`, `test:users`, `test:projects` y `test:participants` con Chrome headless.
- Prisma: `format`, `validate`, `generate` y `migrate status`.
- Infraestructura: Docker Compose válido, PostgreSQL healthy en `localhost:5433`, health REST y conexión/desconexión Socket.IO comprobados.
- Seed ejecutado repetidamente sin duplicar roles o administrador ni modificar proyectos, membresías o invitaciones.

Las pruebas PostgreSQL funcionales usan esquemas temporales y los eliminan al finalizar; no destruyen los datos de desarrollo.
