# Contexto actual de ARQNOVA

ARQNOVA es una plataforma CASE colaborativa para modelado UML de clases y generación automática de un backend Java. Las Fases 0–4E implementan CU01–CU07, interoperabilidad XMI y generación Spring Boot validada con Maven.

## Stack

- React, Vite, TypeScript, Tailwind CSS y React Flow.
- NestJS, Prisma, JWT, bcrypt y Socket.IO.
- PostgreSQL.
- Java 21, Maven, Spring Boot, Bean Validation y Spring Data JPA para el backend generado.

NestJS es la aplicación servidor de ARQNOVA; Spring Boot es un artefacto generado. El repositorio conserva frontend y backend como paquetes npm independientes y reserva `mobile` para un alcance posterior no implementado.

## Alcance vigente

- seguridad, autenticación, usuarios y roles;
- proyectos, participantes e invitaciones;
- editor UML persistente y colaboración realtime;
- propuestas UML mediante proveedor encapsulado, actualmente mock;
- importación/exportación XMI 2.5.1 del subconjunto soportado;
- generación ZIP Spring Boot y compilación Maven temporal.

No forman parte de esta fase móvil, voz, OCR, IA multimodal, escalado realtime multiinstancia ni compatibilidad universal con todos los perfiles XMI.
