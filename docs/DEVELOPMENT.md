# Desarrollo — Fases 0, 1A, 1B y 1C

Seguir README.md desde la raíz del repositorio. Frontend y backend son paquetes npm independientes, con lockfiles; no existe gestor adicional de monorepo. Ejecutar npm ci para reproducir instalaciones y prisma generate antes de compilar backend en una instalación nueva.

## Convenciones

Código y nombres en inglés; textos visibles y documentación en español. Mantener módulos sencillos. Los directorios .gitkeep reservan el espacio de funcionalidades posteriores sin aparentar implementaciones. No hay registro público ni editor. Fase 1C implementa administración protegida; ver USERS_PHASE_1C.md. Fase 1B incorpora login real y dashboard protegido; ver AUTH_PHASE_1B.md.

ConfigModule valida puerto, origen CORS y URL PostgreSQL. ValidationPipe global configura whitelist, forbidNonWhitelisted y transform; Fase 1A agrega DTOs base de usuarios, sin endpoints CRUD. El filtro HTTP devuelve errores básicos y no expone detalles internos al cliente. SocketAdapter aplica el origen configurado a Socket.IO. Cada hook limpia su petición HTTP y conexión socket al desmontarse.

No registrar ni versionar contraseñas, tokens o archivos .env. passwordHash es el único campo de contraseña. Fase 1A integra bcrypt, DTOs, servicios internos, configuración JWT y seed de desarrollo. Fase 1B incorpora autenticación JWT y guard reutilizable. Fase 1C agrega autorización administrativa por rol; ver SECURITY_PHASE_1A.md y AUTH_PHASE_1B.md.

## Diagnóstico

- API no disponible: comprobar PostgreSQL, DATABASE_URL, backend y puerto 3000.
- Realtime desconectado: comprobar VITE_SOCKET_URL y CORS_ORIGIN; Socket.IO usa /collaboration.
- Docker no conecta: iniciar Docker Desktop y comprobar docker info.
- Prisma no conecta: comprobar docker compose ps y credenciales; no resetear ni borrar volúmenes para resolver un error sin evaluar los datos.
- Al cambiar variables Vite, reiniciar el servidor frontend.

Registrar resultados reales de comprobación en docs/VERIFICATION.md. Una compilación exitosa no demuestra por sí sola comunicación REST, conexión WebSocket ni conexión a PostgreSQL.

En este equipo un PostgreSQL local ocupa 5432. Tras informar el conflicto, Docker publica PostgreSQL en 5433 (5432 interno) y DATABASE_URL utiliza localhost:5433. No se modifica el servicio existente.
