# Fase 1C — CU02 Usuarios, roles y permisos

Rama fase-1. Alcance exclusivo: administración de usuarios. No hay registro público, eliminación física, recuperación ni cambios administrativos de contraseña, CRUD de roles o funcionalidades posteriores.

## Endpoints (todos exclusivos de ADMINISTRADOR)

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /api/users?search=texto | Listar; búsqueda opcional por nombre/email, sin distinguir mayúsculas. |
| GET | /api/users/:id | Consultar usuario; 404 si no existe, 400 si ID inválido. |
| POST | /api/users | Crear con name, email, password, roleId e isActive opcional (true por defecto). |
| PATCH | /api/users/:id | Edición parcial de name, email, roleId, isActive. No admite password. |
| PATCH | /api/users/:id/status | Body {"isActive": true} o false. |
| GET | /api/roles | Consultar id/name/description de los tres roles base. |

Sin token válido: 401. Usuario autenticado no administrador: 403. Email duplicado: 409; rol inexistente: 404; campos inválidos/null/ajenos: 400. PATCH vacío se rechaza. Creación reutiliza DTO, normalización de email y bcrypt de Fase 1A. PUBLIC_USER_SELECT centraliza respuestas sin passwordHash. No existe DELETE.

## Autorización

JwtAuthGuard se ejecuta primero y carga al usuario activo desde PostgreSQL. RolesGuard lee @Roles mediante Reflector y compara el rol actual del usuario (no confía en el rol antiguo del JWT). Falla de forma cerrada si no hay metadatos permitidos. @Roles(ADMINISTRADOR) está aplicado a ambos controladores administrativos. ANFITRION y COLABORADOR no administran usuarios; no existe motor dinámico de permisos.

AdministrationModule registra los controladores y reutiliza AuthModule/UsersModule. Mantenerlo separado evita que UsersModule importe AuthModule, que ya depende de UsersModule. Los servicios de autenticación y seguridad no se duplican.

## Último administrador

No se permite desactivar ni cambiar el rol de un ADMINISTRADOR activo si solo queda uno. Se responde 409: No se puede desactivar ni cambiar el rol del último administrador activo.

UsersService.update usa una transacción PostgreSQL y pg_advisory_xact_lock con clave 71401, reservada para modificaciones administrativas de rol/estado. Las actualizaciones se serializan antes de consultar la cuenta y contar administradores activos. El bloqueo se libera automáticamente al finalizar la transacción. Tanto PATCH general como status pasan por este método, por lo que dos solicitudes concurrentes no pueden dejar cero administradores activos.

Si existe otro administrador activo, se permite modificar/desactivar una cuenta administradora. Al desactivar, login, /auth/me y cualquier endpoint con JwtAuthGuard rechazan también JWTs previos. Cambiar el rol retira permisos en la siguiente petición protegida. La UI vuelve a comprobar la sesión si el administrador modifica su propia cuenta.

## Frontend

/admin/users está dentro de ProtectedRoute y AdminRoute. ADMINISTRADOR ve Gestión de usuarios; otros roles no ven el enlace y la ruta manual muestra Acceso no autorizado. Backend conserva autorización independiente de la UI.

La página muestra nombre, email, rol, estado y acciones; búsqueda básica, carga, lista vacía y mensajes de éxito/error. El formulario crea y edita, consulta roles y no solicita ni precarga contraseñas al editar. Desactivar solicita confirmación. Los envíos se bloquean mientras hay una operación pendiente. Los mensajes de conflicto conocidos se permiten explícitamente en el cliente HTTP; no se muestran errores internos arbitrarios.

## Ejecución y pruebas

Usar los .env y servidores descritos en README. Entrar con el administrador del seed y abrir /admin/users. PostgreSQL conserva 5433.

```powershell
# Desde backend, con API detenida antes de regenerar Prisma en Windows:
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run build
npm run test:users
npm run test:security
npm run test:auth
npm run prisma:seed
npm run start:dev

# Desde frontend; para pruebas, ambos servidores deben estar activos:
npm run build
npm run dev
# En otra terminal frontend:
npm run test:users
npm run test:auth
```

Backend CU02 crea un esquema arqnova_test_<UUID> aislado, aplica el SQL inicial allí y prueba usuarios propios. Solo elimina ese esquema temporal; no desactiva al administrador de desarrollo. Requiere que el usuario PostgreSQL de desarrollo pueda crear esquemas, como sucede con Docker actual. Incluye prueba concurrente HTTP y prueba transaccional directa.

El navegador crea un usuario temporal por UI y lo elimina al finalizar. El conflicto del último administrador se simula únicamente para verificar el mensaje visual y evitar desactivar administradores reales; la regla se prueba con PostgreSQL real en el esquema aislado. Chrome/Playwright y variables están descritos en AUTH_PHASE_1B.md.

No hay cambios estructurales Prisma ni nuevas migraciones. Resultados en VERIFICATION_PHASE_1C.md. No iniciar Fase 1D ni fases posteriores sin autorización.
