# Desarrollo — Fase 0

Seguir README.md desde la raíz del repositorio. Frontend y backend son paquetes npm independientes, con lockfiles; no existe gestor adicional de monorepo. Ejecutar npm ci para reproducir instalaciones y prisma generate antes de compilar backend en una instalación nueva.

## Convenciones

Código y nombres en inglés; textos visibles y documentación en español. Mantener módulos sencillos. Los directorios .gitkeep reservan el espacio de funcionalidades posteriores sin aparentar implementaciones. No hay endpoints de usuarios, login real ni editor. El dashboard es público y solo verifica el entorno.

ConfigModule valida puerto, origen CORS y URL PostgreSQL. ValidationPipe global prepara validación DTO (whitelist, forbidNonWhitelisted y transform); los DTO se crearán junto con sus casos de uso. El filtro HTTP devuelve errores básicos y no expone detalles internos al cliente. SocketAdapter aplica el origen configurado a Socket.IO. Cada hook limpia su petición HTTP y conexión socket al desmontarse.

No registrar ni versionar contraseñas, tokens o archivos .env. passwordHash es el único campo de contraseña; no existe ninguna escritura de contraseñas en esta fase. JWT, bcrypt, validación y guards se integrarán en Fase 1; instalar dependencias no equivale a tener autenticación implementada.

## Diagnóstico

- API no disponible: comprobar PostgreSQL, DATABASE_URL, backend y puerto 3000.
- Realtime desconectado: comprobar VITE_SOCKET_URL y CORS_ORIGIN; Socket.IO usa /collaboration.
- Docker no conecta: iniciar Docker Desktop y comprobar docker info.
- Prisma no conecta: comprobar docker compose ps y credenciales; no resetear ni borrar volúmenes para resolver un error sin evaluar los datos.
- Al cambiar variables Vite, reiniciar el servidor frontend.

Registrar resultados reales de comprobación en docs/VERIFICATION.md. Una compilación exitosa no demuestra por sí sola comunicación REST, conexión WebSocket ni conexión a PostgreSQL.

En este equipo un PostgreSQL local ocupa 5432. Tras informar el conflicto, Docker publica PostgreSQL en 5433 (5432 interno) y DATABASE_URL utiliza localhost:5433. No se modifica el servicio existente.

