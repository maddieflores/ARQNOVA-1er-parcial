# Verificación de Fase 0

Fecha: 2026-09-17. Entorno: Windows, Node.js 22.19.0, npm 11.6.0 y Docker Desktop con contenedores Linux.

| Comprobación ejecutada | Resultado |
| --- | --- |
| Frontend: npm run build | OK, TypeScript y Vite 6.4.3, 80 módulos. |
| Frontend: npm run dev | OK, inicia en 5173 con strictPort. |
| Backend: npm run build | OK, Nest CLI 11, runtime NestJS 12, sin errores TypeScript. |
| Backend: npm run start | OK, aplicación Nest iniciada con conexión Prisma requerida. |
| npx prisma validate | OK, esquema PostgreSQL válido. |
| npx prisma generate | OK, Prisma Client 6.12.0. |
| npx prisma migrate dev --name init | Migración 20260917150421_init creada y aplicada. |
| npx prisma migrate status | OK, una migración y base al día. |
| docker compose config --quiet | OK, configuración válida. |
| docker compose up -d y docker compose ps | OK, PostgreSQL 17-alpine healthy y volumen persistente. |
| GET /api/health mediante Invoke-RestMethod | OK: {"status":"ok","service":"arqnova-api"}. |
| Chrome sin ventana sobre frontend real | Inicio y Dashboard muestran arqnova-api: ok y realtime conectado. |
| Socket.IO /collaboration | OK, gateway registra clientes conectados y desconectados. |
| Rutas en Chrome | Inicio, Login, Dashboard y 404 OK; cero errores JavaScript. |
| Tailwind en Chrome | h1 de inicio tiene font-size 30px y font-weight 700 por sus utilidades. |
| npm ls @xyflow/react --prefix frontend | OK, React Flow 12.11.6 instalado; estilos importados. |
| npm audit backend y auditoría instalación frontend | Cero vulnerabilidades en ambas instalaciones finales. |

## Incidencias resueltas

- Docker Desktop estaba detenido: se inició para la comprobación real.
- La red y accesos del entorno restringido bloquearon npm y Prisma: se ejecutaron con permiso, manteniendo archivos del proyecto en C:\Proyectos\ARQNOVA.
- Un PostgreSQL existente ocupaba 5432. Tras informar al usuario, se publicó el contenedor en 5433; el puerto interno sigue siendo 5432. DATABASE_URL y documentación están actualizados. No se detuvo ni modificó el servicio existente.
- Se probaron localhost e IPv6 en 5432; ambos fallaron por autenticación y no solucionaron el conflicto. En 5433 la migración funcionó.
- La primera generación después de aplicar la migración falló por versiones distintas de Prisma CLI y cliente. Se alinearon y regeneró correctamente; el estado final de migración se comprobó.
- Se alineó el runtime NestJS 12 con ConfigModule y JWT compatibles; Prisma CLI/cliente se fijaron en 6.12.0 para evitar avisos de dependencias transitivas. Se conservó CLI Nest 11 para compatibilidad con Node instalado. La auditoría final no presenta avisos.

Los archivos .env locales contienen valores aleatorios y están ignorados. Los .env.example contienen marcadores, nunca credenciales reales. No se creó ningún commit. Las herramientas temporales de navegador y cachés están ignoradas y no forman parte de las dependencias declaradas.

Fase 0 completada. No se implementó Fase 1 ni casos de uso posteriores.
