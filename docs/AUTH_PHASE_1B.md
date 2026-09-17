# Fase 1B — CU01 Gestionar autenticación

Rama: fase-1. Backend 3000, frontend 5173 y PostgreSQL Docker 5433. Sin registro público, CRUD de usuarios, autorización por roles ni funcionalidades de Fase 1C.

## Endpoints

### POST /api/auth/login

JSON de entrada: email válido y password obligatorio. Email se normaliza a minúsculas y sin espacios exteriores; la contraseña nunca se recorta. Usa DTOs y bcrypt existentes.

Respuesta 200: accessToken y user público (id, name, email, isActive y role con id/name). Nunca se devuelve passwordHash. Credenciales incorrectas, email inexistente o cuenta inactiva responden 401 con el mismo mensaje: Credenciales inválidas. Datos de entrada inválidos responden 400. Respuestas de autenticación llevan Cache-Control: no-store.

### GET /api/auth/me

Requiere el header Authorization: Bearer <accessToken>. Respuesta 200: id, name, email, isActive y role (id/name). Sin token, token inválido/expirado, firma incorrecta, algoritmo no permitido, usuario eliminado o inactivo: 401.

JwtAuthGuard extrae Bearer y usa AuthService para verificar el JWT y consultar al usuario actual. Las páginas y endpoints futuros pueden reutilizarlo. No existe guard global ni control completo de permisos.

## JWT

Se reutiliza ConfigModule y JwtModule de Fase 1A: JWT_SECRET aleatorio local de al menos 32 caracteres y JWT_EXPIRES_IN como entero positivo en segundos (ejemplo 3600). Se firma con HS256 y se verifica exclusivamente ese algoritmo. Payload: sub (ID), email, role, más iat/exp. La identidad/actividad y rol vigentes se obtienen de PostgreSQL al acceder a /me; no se concede autorización usando un rol obsoleto dentro del token.

No hay refresh tokens, blacklist ni endpoint de logout. Logout elimina la sesión del cliente; el token previamente emitido mantiene su validez hasta expirar, salvo que el usuario sea eliminado/desactivado. No se imprimen contraseñas ni tokens.

## Sesión frontend

session-store.ts centraliza localStorage en una única clave: arqnova.auth.token. Se guarda exclusivamente el token, sin contraseña ni datos de usuario. Los datos públicos viven en AuthProvider. El servicio es reemplazable si se cambia la estrategia de almacenamiento.

El cliente HTTP central agrega Bearer a llamadas autenticadas. Login es público y no envía un token anterior. Un 401 autenticado limpia almacenamiento y estado, y las rutas protegidas redirigen al login. Las respuestas de peticiones antiguas no deben eliminar una sesión nueva.

Al iniciar/recargar, AuthProvider recupera token y consulta /auth/me antes de mostrar el dashboard. Una falla de red conserva el token y presenta Reintentar; no simula una sesión válida. Se sincronizan cambios de sesión entre pestañas.

/login es público; un usuario autenticado se redirige al dashboard. /dashboard requiere sesión confirmada. Muestra nombre, email, rol y Cerrar sesión. El formulario usa validación básica, carga, errores controlados y bloqueo de envíos simultáneos. No hay enlace de registro público.

## Desarrollo y pruebas

Configurar los .env según README y JWT/ADMIN_* según SECURITY_PHASE_1A.md. Ejecutar seed para disponer del administrador; usar ADMIN_EMAIL y ADMIN_PASSWORD del .env local para entrar en /login. Cerrar sesión desde el dashboard.

```powershell
# Desde backend:
npm run build
npm run test:security
npm run test:auth
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run prisma:seed
npm run start:dev

# En otra terminal, desde frontend:
npm run build
npm run dev

# Con ambos servidores iniciados, desde frontend:
npm run test:auth
```

Las pruebas backend arrancan un listener temporal en un puerto libre y consultan PostgreSQL real. Usan usuarios temporales, sin modificar al administrador. La prueba frontend usa Playwright y Chrome instalado; lee .env locales sin imprimir credenciales. Chrome puede seleccionarse con PLAYWRIGHT_CHROME_EXECUTABLE (ruta al ejecutable). No se descargan navegadores adicionales. Los temporales se mantienen en .verification/ ignorado.

El test frontend requiere backend compilado, ambos servidores disponibles y administrador creado por seed. Cubre login, persistencia, /me, protección, logout, errores, bloqueo de envíos, health y Socket.IO. Solo elimina los usuarios temporales que crea.

Resultados ejecutados en VERIFICATION_PHASE_1B.md. Detenerse al finalizar Fase 1B; Fase 1C requiere autorización.
