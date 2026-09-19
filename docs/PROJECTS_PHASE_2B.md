# Gestión de proyectos UML — Fase 2B

La Fase 2B implementa CU03 para el rol `ANFITRION`. No incluye participantes, invitaciones visuales ni editor UML.

## API

Todos los endpoints requieren `Authorization: Bearer <token>` y rol global `ANFITRION`:

- `GET /api/projects`: lista únicamente proyectos no eliminados del anfitrión autenticado. Acepta búsqueda opcional `search` por nombre.
- `GET /api/projects/:id`: consulta un proyecto propio.
- `POST /api/projects`: crea un proyecto. Acepta `name` y `description`; el propietario se toma exclusivamente del JWT.
- `PATCH /api/projects/:id`: modifica únicamente `name` y `description`.
- `DELETE /api/projects/:id`: marca `deletedAt` sin eliminar físicamente el proyecto.

La ausencia de autenticación produce `401`; un rol distinto o un anfitrión que intenta operar sobre un proyecto ajeno recibe `403`; un proyecto inexistente o eliminado produce `404`.

## Propiedad y persistencia

`ProjectsController` aplica `JwtAuthGuard` antes de `RolesGuard`. `ProjectsService.verifyOwner` centraliza la comprobación de propiedad y actividad del usuario. El cliente no puede suministrar ni cambiar `ownerId`. Los listados filtran `deletedAt: null`, mientras que el registro y sus relaciones permanecen en PostgreSQL para conservar la información entre sesiones.

## Frontend

- `/projects`: listado, búsqueda, creación, edición y eliminación con confirmación y estados de carga, vacío, éxito y error.
- `/projects/:id`: consulta básica del proyecto, propietario y fechas. Solo incluye el aviso de que el editor UML estará disponible en una fase posterior.
- `HostRoute` protege ambas rutas. La navegación muestra “Proyectos” únicamente a `ANFITRION`; el backend conserva la autorización efectiva.

El módulo reutiliza el cliente HTTP y la sesión JWT existentes.

## Pruebas

- `npm run test:projects` verifica CU03 por HTTP real sobre un esquema PostgreSQL temporal.
- `npm run test:projects-base` mantiene las reglas y servicios de Fase 2A.
- `npm run test:security`, `test:auth` y `test:users` cubren la regresión de Fase 1.
- `npm run test:projects` en frontend verifica el flujo completo en navegador y los bloqueos por rol.
- Los builds de backend y frontend y los comandos Prisma se ejecutan antes del cierre.
