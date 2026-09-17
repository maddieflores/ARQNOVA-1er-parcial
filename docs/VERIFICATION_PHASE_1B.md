# Verificación — Fase 1B

Fecha: 2026-09-17. Rama fase-1 verificada antes de cambios; árbol inicialmente limpio. Backend NestJS en 3000, frontend en 5173 y PostgreSQL Docker en 5433.

| Comprobación ejecutada | Resultado |
| --- | --- |
| Backend npm run build | OK, sin errores TypeScript. |
| Frontend npm run build | OK, TypeScript y Vite, 84 módulos. |
| Backend npm run test:auth | Ocho casos HTTP aprobados (nueve pruebas TAP con el contenedor), cero fallos. |
| Backend npm run test:security | Cinco pruebas de Fase 1A aprobadas, cero fallos. |
| Frontend npm run test:auth | Chrome/Playwright: todos los flujos aprobados; cero errores JavaScript/React. |
| npx prisma validate | OK. |
| npx prisma generate | OK, Prisma Client 6.12.0. |
| npx prisma migrate status | Base al día; migración inicial preservada. |
| npm run prisma:seed | OK; tres roles y administrador existente conservados. |
| Health y Socket.IO | Health ok y realtime conectado visibles en dashboard real. |
| CORS | Origin configurado se conserva; prueba HTTP verifica que no se usa comodín. |
| package.json / lockfiles | Dependencias coherentes en ambos paquetes. |

## Backend

Las pruebas ejecutan HTTP real con la configuración compartida de producción/desarrollo y PostgreSQL real. Cubren login, normalización, administrador del seed, contraseña incorrecta, email inexistente, usuario inactivo, datos inválidos, usuario eliminado y /me con JWT válido, ausente, expirado, inválido, firma incorrecta, algoritmo distinto y subject inválido. Verifican campos públicos, ausencia de passwordHash, expiración configurada y Cache-Control: no-store.

Solo se crean/modifican/eliminan usuarios temporales de prueba. El administrador y datos existentes no se destruyen. El seed sigue siendo idempotente y no se modifica el modelo Prisma.

## Frontend en navegador real

Se comprobó /login, dashboard sin sesión, error de credenciales, login correcto y datos públicos, redirección, persistencia al recargar y comprobación /me, redirección de login autenticado, logout y bloqueo posterior del dashboard. Solo existe la clave arqnova.auth.token en almacenamiento.

También se comprobaron tokens inválidos/expirados, cuenta inactiva, API no disponible, error inesperado sin detalles internos, indicador de carga, botón deshabilitado y rechazo de doble envío. La recuperación de sesión con falla de red conserva token y permite reintento; un 401 limpia sesión y vuelve al login. La prueba usa viewport móvil de 390x844.

## Incidencias y alcance

Se detuvo el backend del proyecto antes de regenerar Prisma para evitar el bloqueo de DLL conocido en Windows y luego se reinició actualizado. Los comandos backend y navegador requirieron permiso por restricciones del entorno. No hubo fallos en las suites de esta fase.

Playwright se agregó únicamente como dependencia de desarrollo; la instalación reportó cero vulnerabilidades. No se agregan dependencias Passport porque el guard Nest reutiliza directamente JwtService y AuthService.

No se crearon migraciones ni tablas nuevas. No hay CRUD, registro público, permisos aplicados por rol, refresh tokens ni funcionalidades de Fase 1C. No se imprimen tokens ni contraseñas. Los .env reales permanecen ignorados y sin registrar en Git.

FASE 1B COMPLETADA: SÍ. Sin problemas pendientes.
