# Desarrollo — Fases 0 a 4E

Seguir README.md desde la raíz del repositorio. Frontend y backend son paquetes npm independientes, con lockfiles; el `package.json` raíz solo orquesta builds y regresión. Ejecutar `npm ci` en ambos paquetes y `prisma generate` antes de compilar una instalación nueva.

## Convenciones

Código y nombres en inglés; textos visibles y documentación en español. Mantener módulos sencillos y las fronteras actuales. No hay registro público. CU01–CU07, XMI y generación están implementados; los documentos específicos describen sus decisiones.

ConfigModule valida puerto, origen CORS, URL PostgreSQL, JWT y configuración de IA. ValidationPipe global configura whitelist, forbidNonWhitelisted y transform. El filtro HTTP devuelve errores básicos y no expone detalles internos. SocketAdapter aplica el origen configurado a Socket.IO.

No registrar ni versionar contraseñas, tokens o archivos `.env`. `passwordHash` es el único campo de contraseña y nunca forma parte de selecciones públicas. La autorización por proyecto se valida en backend.

## Regresión

`npm run test:all` desde la raíz ejecuta backend y Playwright, levantando temporalmente los servidores. Requiere PostgreSQL, Chrome, Java 21 y Maven 3.9+. Los proyectos Spring se validan en el directorio temporal del sistema y se eliminan incluso si Maven falla.

## Diagnóstico

- API no disponible: comprobar PostgreSQL, DATABASE_URL, backend y puerto 3000.
- Realtime desconectado: comprobar VITE_SOCKET_URL y CORS_ORIGIN; Socket.IO usa /collaboration.
- Docker no conecta: iniciar Docker Desktop y comprobar docker info.
- Prisma no conecta: comprobar docker compose ps y credenciales; no resetear ni borrar volúmenes para resolver un error sin evaluar los datos.
- Al cambiar variables Vite, reiniciar el servidor frontend.

Registrar resultados reales de comprobación en docs/VERIFICATION.md. Una compilación exitosa no demuestra por sí sola comunicación REST, conexión WebSocket ni conexión a PostgreSQL.

En este equipo un PostgreSQL local ocupa 5432. Tras informar el conflicto, Docker publica PostgreSQL en 5433 (5432 interno) y DATABASE_URL utiliza localhost:5433. No se modifica el servicio existente.
