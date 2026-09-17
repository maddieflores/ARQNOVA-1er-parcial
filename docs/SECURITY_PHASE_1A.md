# Fase 1A — Seguridad y usuarios

Rama de trabajo: fase-1. No se implementa login, emisión de tokens a usuarios, recuperación, logout, endpoints CRUD ni administración web.

## Modelo y migraciones

Se conserva el modelo de Fase 0: User (id UUID, name, email único, passwordHash, isActive por defecto true, roleId obligatorio, createdAt, updatedAt) y Role (id UUID, name único, description opcional, createdAt, updatedAt). Un rol tiene muchos usuarios. La FK restringe eliminar roles utilizados.

El esquema ya cumplía los requisitos y solo se formateó. No se crea una migración vacía ni se borra la inicial 20260917150421_init. migrate dev verifica/aplica el historial existente sin resetear datos.

```powershell
Set-Location C:\Proyectos\ARQNOVA\backend
npx prisma format
npx prisma validate
npx prisma migrate dev
npx prisma generate
npx prisma migrate status
```

PostgreSQL Docker conserva localhost:5433. Antes de regenerar Prisma en Windows, detener servidores del proyecto que tengan cargada su DLL.

## Seguridad y servicios internos

PasswordService genera hashes bcrypt con coste 12 y compara contraseñas. Se requieren al menos 10 caracteres y como máximo 72 bytes UTF-8 para evitar truncamiento de bcrypt. Nunca se recorta ni normaliza una contraseña.

UsersService permite crear con hash, consultar por ID/email, comprobar email y obtener rol. Normaliza email a minúsculas y sin espacios exteriores. Los resultados generales utilizan PUBLIC_USER_SELECT, sin passwordHash. findCredentialsByEmail es un método interno explícito para futura autenticación; jamás retornar su resultado desde controladores.

CreateUserDto y UpdateUserDto validan nombre, email, contraseña, roleId UUID y boolean isActive. Los campos opcionales admiten ausencia, pero rechazan null. El servicio create vuelve a validar los datos para cubrir llamadas internas, rechaza propiedades no autorizadas y verifica existencia del rol. Errores de duplicados y FK se traducen a excepciones Nest (409/404); datos inválidos a 400 y usuario inexistente a 404.

SystemRole define ADMINISTRADOR, ANFITRION y COLABORADOR. ROLE_PERMISSIONS define la base de lectura/creación/actualización de usuarios y lectura de roles para ADMINISTRADOR. ANFITRION y COLABORADOR no reciben permisos de administración. Sus permisos funcionales se concretarán al implementar los casos de uso correspondientes. RequirePermissions reserva metadatos para guards futuros; ningún guard ni decorator se aplica todavía a la API. No existe rol Usuario móvil ni tablas adicionales de permisos.

## Variables backend/.env

| Variable | Uso |
| --- | --- |
| JWT_SECRET | Secreto aleatorio local de al menos 32 caracteres; obligatorio, sin valor real en ejemplos. |
| JWT_EXPIRES_IN | Entero positivo en segundos; ejemplo 3600. |
| ADMIN_NAME | Nombre del administrador inicial de desarrollo. |
| ADMIN_EMAIL | Email válido del administrador inicial; se normaliza. |
| ADMIN_PASSWORD | Contraseña local, nunca incluida en código, ejemplos ni Git. |

ConfigModule valida JWT_SECRET y JWT_EXPIRES_IN. AuthModule registra JwtModule asíncronamente con ConfigService, algoritmo HS256 y verificación limitada a ese algoritmo. No hay endpoint de login ni emisión de tokens al usuario. ADMIN_* se valida únicamente al ejecutar el seed; no es requisito para arrancar la API.

## Seed

Definir ADMIN_* en backend/.env y ejecutar desde backend:

```powershell
npm run prisma:seed
# Alternativa integrada con Prisma:
npx prisma db seed
```

El comando compila y ejecuta dist/prisma/seed.js. Reutiliza ConfigModule, PasswordService y DTOs, sin dependencias nuevas. Valida antes de escribir y crea roles/administrador en una transacción. Los upserts por nombre/email evitan duplicados. Al repetirlo conserva IDs, contraseñas, nombres y datos existentes; no resetea ni cambia la contraseña del administrador. Si el email ya pertenece a una cuenta no administradora o inactiva, falla y no eleva privilegios. Se rechaza NODE_ENV=production: este seed está reservado a desarrollo.

En este equipo se generó ADMIN_PASSWORD aleatoriamente dentro del .env ignorado. Otro integrante debe generar su propio valor local. El seed no imprime contraseñas ni hashes.

## Pruebas

```powershell
npm run build
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run prisma:seed
npm run prisma:seed
npm run test:security
```

Las pruebas incluyen DTOs, bcrypt, rechazo multibyte, configuración JWT, permisos reservados, errores concurrentes de Prisma y servicios sobre PostgreSQL real. Comprueban roles, administrador, hash e idempotencia. Eliminan únicamente los usuarios temporales que ellas crearon; nunca resetean la base. Consultar VERIFICATION_PHASE_1A.md para resultados ejecutados.

Referencias: [JWT en NestJS](https://docs.nestjs.com/security/authentication), [límite bcrypt](https://github.com/kelektiv/node.bcrypt.js/), [seed Prisma](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/seeding).
