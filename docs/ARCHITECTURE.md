# Arquitectura de ARQNOVA — Fase 4E

```text
Frontend React
  páginas + rutas protegidas + React Flow
       | REST / Socket.IO
Backend NestJS modular
  Auth | Users | Projects | UML | Collaboration | AI | XMI | Generator
       | Prisma
PostgreSQL
```

REST usa el prefijo `/api`; Socket.IO usa el namespace `/collaboration`. `PrismaService` administra la conexión y PostgreSQL es la fuente de verdad para usuarios, proyectos y modelos UML.

## Persistencia

`User` pertenece a un `Role`. `Project` tiene propietario, miembros e invitaciones. Cada proyecto posee un diagrama principal con `UmlClass`, `UmlAttribute`, `UmlMethod` y `UmlRelation`. Las restricciones y transacciones protegen unicidad, aceptación de invitaciones y aplicación/importación de modelos.

## Seguridad y autorización

- bcrypt para hashes de contraseña y JWT HS256 configurado por entorno;
- consulta del usuario activo al validar la sesión;
- roles `ADMINISTRADOR`, `ANFITRION` y `COLABORADOR`;
- propiedad o membresía validada en backend para proyectos, UML, IA, XMI y generación;
- DTO global con whitelist y filtro HTTP que no expone errores internos;
- `passwordHash` y hashes de invitación excluidos de respuestas públicas.

## Realtime

Las rooms se aíslan por proyecto. El servidor emite únicamente cambios ya persistidos. Presencia y locks con TTL viven en memoria y son apropiados para una única instancia NestJS.

Esta es una limitación deliberada del alcance: un despliegue con múltiples instancias necesitaría Redis u otro coordinador externo para compartir rooms, presencia y locks. Fase 4E documenta el límite y no cambia la implementación.

## IA, XMI y generación

`AiModule` encapsula el proveedor y valida propuestas antes de aplicarlas de forma aditiva en una transacción. El proveedor disponible es mock.

`XmiModule` valida completamente el XML, construye un resumen interno y solo después reemplaza el diagrama dentro de una transacción serializable. Un error conserva el diagrama previo.

`CodeGeneratorModule` transforma el UML en archivos Java/Spring Boot. Antes de responder con éxito, escribe los archivos en un directorio temporal, ejecuta `mvn -DskipTests package` y elimina el directorio en todos los casos. El ZIP se construye en memoria y no se almacena permanentemente.

```text
ARQNOVA -> UML persistido -> plantillas TypeScript -> Java/Spring Boot/JPA
                                               -> Maven package
                                               -> ZIP en memoria
```
