# Base de proyectos y participantes — Fase 2A

Esta fase prepara persistencia y servicios internos para CU03 y CU04. No expone controladores ni incorpora interfaz de proyectos o invitaciones.

## Modelo de datos

- `Project`: nombre, descripción opcional, propietario, fechas de auditoría y `deletedAt` para borrado lógico. Cada proyecto tiene exactamente un `User` propietario.
- `ProjectMember`: relaciona un usuario con un proyecto y registra `joinedAt`. La clave única compuesta `(projectId, userId)` evita participantes duplicados.
- `ProjectInvitation`: relaciona proyecto y usuario registrado, contiene el hash único del token, estado, vencimiento y fechas de creación/aceptación.
- `InvitationStatus`: `PENDING`, `ACCEPTED`, `REJECTED` y `EXPIRED`.

Se usa `invitedUserId` porque ARQNOVA autoriza colaboradores registrados. Esto aporta integridad referencial y evita mantener identidades por email fuera de `User`. El token utilizable se entrega una sola vez al crear la invitación; PostgreSQL solo conserva su SHA-256.

## Reglas centralizadas

- Solo un usuario activo con rol global `ANFITRION` puede crear y poseer proyectos.
- El propietario tiene acceso implícito y no se duplica en `ProjectMember`.
- Solo el propietario activo puede administrar participantes o crear invitaciones.
- Un colaborador accede únicamente cuando existe su membresía y su usuario permanece activo.
- No se admiten miembros duplicados, inexistentes o inactivos.
- Las invitaciones pertenecen a un usuario, vencen en un máximo de 30 días y no pueden aceptarse dos veces.
- El borrado de proyecto es lógico mediante `deletedAt`; las consultas operativas ignoran proyectos eliminados.

## Servicios y DTOs

- `ProjectsService`: crear, consultar, listar por propietario, verificar propietario, validar acceso, actualizar y borrar lógicamente.
- `ParticipantsService`: listar, comprobar membresía, agregar y retirar participantes.
- `InvitationsService`: crear, buscar, validar, aceptar y rechazar invitaciones.
- DTOs: `CreateProjectDto`, `UpdateProjectDto`, `AddParticipantDto` y `CreateInvitationDto`.

Los servicios se exportan desde `ProjectsModule`. Los endpoints y las interfaces completas se reservan para las siguientes fases.

## Migración

`20260919204657_add_projects_participants_invitations` crea los tres modelos, el enum, claves foráneas, índices y restricciones únicas. Fue aplicada sobre PostgreSQL local en `localhost:5433` sin eliminar migraciones anteriores.

## Verificación

- `npm run test:projects-base`: prueba en un esquema PostgreSQL temporal creación y persistencia, propietario, acceso, participantes, duplicados, invitaciones vigentes/expiradas y borrado lógico.
- Regresión: `npm run test:security`, `npm run test:auth` y `npm run test:users`.
- Compilación: `npm run build` en backend y frontend.
- Prisma: `prisma format`, `validate`, `generate` y `migrate status`.

La prueba de Fase 2A crea y elimina un esquema aislado; no modifica los datos de desarrollo.
