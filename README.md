# ARQNOVA — Fases 0 a 4E

ARQNOVA es una plataforma CASE web colaborativa para diseñar diagramas UML de clases, trabajar en tiempo real, generar propuestas UML asistidas, intercambiar modelos XMI y producir un backend Java/Spring Boot descargable.

## Arquitectura y tecnologías

```text
React + React Flow + Socket.IO Client
              | REST / WebSocket
NestJS + JWT + Socket.IO + Prisma
              | SQL
          PostgreSQL 17

Modelo UML -> generador -> Java 21 + Spring Boot + JPA + PostgreSQL
```

- Frontend: React 19, Vite 6, TypeScript 5.9, Tailwind CSS 4, React Flow y Playwright.
- Backend: NestJS 12, Prisma 6.12, JWT, bcrypt, Socket.IO, JSZip y fast-xml-parser.
- Datos: PostgreSQL 17 mediante Docker Compose.
- Generado: Java 21, Maven, Spring Boot 3.3, Spring Web, Bean Validation, Spring Data JPA, PostgreSQL y Lombok.

NestJS es el backend de ARQNOVA. Spring Boot es el producto generado desde el modelo UML.

## Funcionalidades implementadas

| Caso de uso | Alcance |
| --- | --- |
| CU01 | Autenticación JWT, recuperación de sesión y cierre de sesión. |
| CU02 | Usuarios, roles, activación, desactivación y protección del último administrador. |
| CU03 | Proyectos UML con propiedad y borrado lógico. |
| CU04 | Participantes, invitaciones con token protegido y proyectos compartidos. |
| CU05 | Editor UML persistente: clases, atributos, métodos, relaciones y posiciones. |
| CU06 | Colaboración realtime: rooms, presencia, sincronización, locks y TTL. |
| CU07 | Propuestas UML estructuradas y aplicación aditiva transaccional. |

También están implementados:

- importación y exportación del subconjunto XMI 2.5.1 soportado por ARQNOVA;
- generación y descarga ZIP de un backend Spring Boot;
- compilación Maven temporal obligatoria antes de informar una generación exitosa;
- validaciones Bean Validation, manejo HTTP básico de errores y configuración PostgreSQL en el proyecto generado.

La integración IA disponible usa `AI_PROVIDER=mock`: valida el contrato y el flujo completo sin enviar información a un proveedor externo. Voz, OCR, IA multimodal y aplicación móvil no forman parte de las Fases 0–4E.

## Requisitos

- Node.js 22.19 o compatible y npm.
- Docker Desktop con contenedores Linux para PostgreSQL.
- Java 21 y Maven 3.9 o superior para validar y descargar backends generados.
- Google Chrome para las pruebas Playwright actuales.

## Configuración local

Desde la raíz, crear únicamente los archivos que todavía no existan:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Configurar la misma contraseña PostgreSQL en `.env` y `backend/.env`, un `JWT_SECRET` aleatorio de al menos 32 caracteres y `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Los `.env` están ignorados por Git. Ningún secreto backend debe usar el prefijo público `VITE_`.

```powershell
docker compose up -d
npm ci --prefix backend
npm ci --prefix frontend
npm run prisma:generate --prefix backend
npm run prisma:migrate:deploy --prefix backend
npm run prisma:seed --prefix backend
```

## Ejecución

En dos terminales:

```powershell
npm run start:dev --prefix backend
npm run dev --prefix frontend
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health
- Socket.IO: namespace `/collaboration` en http://localhost:3000
- PostgreSQL: localhost:5433

Rutas principales: `/login`, `/dashboard`, `/admin/users`, `/projects`, `/shared-projects` y `/projects/:id/editor`.

## Verificación

La regresión completa compila ambos paquetes, ejecuta todas las pruebas backend, prepara la base local, levanta temporalmente backend/frontend y ejecuta las pruebas Playwright:

```powershell
npm run test:all
```

También pueden ejecutarse por separado:

```powershell
npm run test:backend
npm run test:frontend  # requiere backend y frontend activos
npm run build
npm run prisma:validate --prefix backend
```

Las pruebas backend crean esquemas PostgreSQL temporales aislados. La validación del generador extrae el proyecto en el directorio temporal del sistema, ejecuta Maven y elimina siempre el contenido temporal.

## Documentación

- [Contexto del proyecto](docs/PROJECT_CONTEXT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Fases](docs/PHASES.md)
- [Reporte final de Fase 4](docs/PHASE_4_FINAL_REPORT.md)
- [Desarrollo](docs/DEVELOPMENT.md)

No usar `docker compose down -v` si se desea conservar la base local.
