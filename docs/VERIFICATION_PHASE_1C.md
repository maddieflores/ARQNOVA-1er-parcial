# Verificación — Fase 1C

Fecha: 2026-09-17. Rama fase-1; árbol inicialmente limpio. PostgreSQL localhost:5433. Sin cambios a main ni fases posteriores.

| Comprobación ejecutada | Resultado |
| --- | --- |
| Backend npm run build | OK, sin errores TypeScript/imports. |
| Frontend npm run build | OK, Vite y TypeScript, 88 módulos. |
| Backend npm run test:users | Once casos CU02 aprobados (12 pruebas TAP incluido contenedor). |
| Backend npm run test:security | Cinco pruebas de Fase 1A aprobadas. |
| Backend npm run test:auth | Ocho casos CU01 aprobados (nueve pruebas TAP incluido contenedor). |
| Frontend npm run test:users | Crear/editar/rol/estado, errores y acceso por rol en Chrome: OK. |
| Frontend npm run test:auth | Login/logout/persistencia/rutas/errores/health/realtime: OK. |
| Prisma format, validate, generate | OK, Prisma 6.12.0. |
| Prisma migrate status | Base al día; migración inicial conservada. |
| npm run prisma:seed | Tres roles y administrador conservados, sin duplicados. |
| JavaScript en navegador | Cero errores en ambas pruebas. |
| Coherencia lockfiles | OK, sin dependencias nuevas. |

CU02 backend verifica autorización ADMINISTRADOR, 401 sin sesión, 403 ANFITRION/COLABORADOR en todos los endpoints administrativos, información pública, creación con bcrypt, edición parcial y rol, búsqueda, desactivación y rechazo de JWT previo, activación, errores 400/404/409, ausencia de passwordHash y protección del último administrador. La prueba de concurrencia deja exactamente un administrador activo. El esquema temporal se elimina al cerrar; usuarios reales no se modifican.

Chrome verifica creación, edición sin campo contraseña, cambio de rol, estado con confirmación, conflicto de email, mensaje del último administrador, búsqueda vacía y navegación exclusiva. El mensaje visual del último administrador usa respuesta simulada para no afectar cuentas reales. La protección real se comprueba en backend aislado. El usuario temporal del navegador se elimina al terminar.

## Incidencias resueltas

- Un comando PowerShell tenía una comilla JSX mal escapada. Falló antes de modificar frontend y se reejecutó corregido.
- La primera prueba concurrente esperaba siempre 409, pero podía recibir 401 si la primera solicitud desactivaba al administrador de la segunda. Se corrigió esa expectativa y se agregó concurrencia directa de servicio para comprobar el bloqueo transaccional independientemente del guard.
- La etiqueta del campo contraseña incluía el texto de ayuda e impedía localizarla por su nombre exacto. Se separaron etiquetas y ayudas con htmlFor/aria-describedby; build y prueba de navegador pasaron al repetirlos.
- Se detuvo/reinició solo el backend del proyecto para regenerar Prisma sin bloquear su DLL en Windows.

No hay cambios de contraseña por PATCH, registro público, DELETE, CRUD dinámico de roles ni fases posteriores. Sin problemas pendientes.

FASE 1C COMPLETADA: SÍ.
