# Arquitectura base

```text
Frontend React
    | REST / Socket.IO
Backend NestJS (una aplicación modular)
    | Prisma
PostgreSQL
```

REST utiliza el prefijo /api. GET /api/health comprueba la comunicación HTTP. Socket.IO usa el namespace /collaboration y solamente registra conexiones y desconexiones. El prefijo REST no se aplica a Socket.IO.

PrismaService establece conexión al iniciar NestJS y la libera al cerrar. Si PostgreSQL no está disponible, el backend falla al iniciar; no se simula una conexión exitosa. Health es una prueba de comunicación y no una consulta de disponibilidad continua de la base de datos.

User pertenece a un Role obligatorio. Email y nombre de rol son únicos; roleId tiene índice y no permite eliminar un rol utilizado. Las contraseñas futuras se guardarán exclusivamente como hashes. No hay usuarios sembrados ni endpoints de autenticación. JWT y bcrypt están instalados, sin guards ficticios.

Los directorios reservados delimitan módulos futuros; se crearán sus módulos Nest y lógica cuando se implementen sus casos de uso. No hay microservicios ni herramientas de monorepo.

```text
ARQNOVA -> modelo UML -> generador -> Java + Spring Boot + Spring Data JPA
                                                      | API REST
                                                  PostgreSQL
```

Este flujo es conceptual y futuro. XML/XMI, plantillas TypeScript, ZIP, Postman y Flutter no se implementan en Fase 0. React Flow está instalado y sus estilos se cargan, sin crear un editor.

Se fija Prisma 6.12 para conservar una integración sencilla con PrismaClient y datasource en schema.prisma. Tailwind 4 se integra con el plugin de Vite. Los lockfiles fijan las dependencias reproducibles.

Referencias técnicas: [NestJS gateways](https://docs.nestjs.com/websockets/gateways), [Prisma 6 datasource](https://www.prisma.io/docs/v6/orm/prisma-schema/overview/data-sources), [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite).


Se conserva la CLI Nest 11 compatible con Node 22.19 para compilación y watch; el runtime Nest es 12. Prisma CLI y cliente se fijan exactamente en 6.12.0 para evitar los avisos de dependencias transitivas introducidas después. No se cambia ninguna tecnología del stack.
