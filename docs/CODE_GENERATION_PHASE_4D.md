# Fase 4D — Generación automática de backend

## Arquitectura

`CodeGeneratorModule` contiene el controlador, el servicio de transformación y plantillas TypeScript separadas para proyecto Maven y código Java. `CodeGeneratorService` carga el diagrama mediante `DiagramsService`; no introduce entidades UML, tablas ni almacenamiento paralelo.

El resultado se genera de forma determinista desde PostgreSQL. `POST generate` entrega un manifiesto para la interfaz y `GET download` vuelve a generar el mismo contenido y lo comprime en memoria. El servidor no conserva ZIP obsoletos.

## Flujo

1. Valida JWT, usuario activo y acceso como anfitrión propietario o colaborador miembro.
2. Carga clases, atributos, métodos y relaciones del diagrama.
3. Normaliza identificadores Java y rechaza colisiones.
4. Convierte tipos UML habituales a Java.
5. Aplica herencia y relaciones JPA según tipo y multiplicidad.
6. Ejecuta las plantillas en un directorio temporal.
7. Ejecuta `mvn -DskipTests package`; un fallo impide informar éxito o descargar el ZIP.
8. Elimina el directorio temporal y crea `generated-backend.zip` en memoria.

## Estructura generada

```text
generated-backend/
├── pom.xml
├── README.md
└── src/main/
    ├── java/com/arqnova/generated/
    │   ├── GeneratedBackendApplication.java
    │   ├── controller/
    │   ├── dto/
    │   ├── model/
    │   ├── repository/
    │   └── service/
    └── resources/application.properties
```

El proyecto usa Java 21, Spring Boot, Spring Web, Bean Validation, Spring Data JPA, PostgreSQL y Lombok. La conexión se configura con `DB_URL`, `DB_USER` y `DB_PASSWORD`.

## Conversión UML

- Cada clase produce entidad, DTO, repositorio, servicio y controlador REST.
- La clave UML marcada como primaria se convierte en `@Id`; si una raíz no tiene clave se añade un `Long id` generado.
- `String`, números, booleanos, fechas, UUID y decimales tienen mapeos Java conocidos. Un tipo externo desconocido se conserva como comentario UML y usa `String` para mantener el proyecto compilable.
- La herencia genera `extends`.
- Una multiplicidad destino múltiple genera `@OneToMany` y `List<T>`.
- Una multiplicidad destino singular genera `@ManyToOne`.
- La composición añade `CascadeType.ALL`; en colecciones también `orphanRemoval`.
- Las dependencias se representan con `@Transient`.
- Los métodos UML se generan con la firma correspondiente y un cuerpo explícito que exige implementar la lógica de negocio.
- Los campos de texto usan `@NotBlank` y los demás atributos UML usan `@NotNull`.
- Un `@ControllerAdvice` traduce recursos inexistentes y solicitudes inválidas a respuestas HTTP controladas.

## Endpoints

- `POST /api/projects/:projectId/code-generation/generate`: valida y devuelve proyecto, cantidad de clases y manifiesto de archivos.
- `GET /api/projects/:projectId/code-generation/download`: devuelve `generated-backend.zip`.

## Frontend

El editor incorpora **Generar Backend**. Tras una generación correcta muestra **Descargar ZIP** y mensajes controlados de progreso, éxito o error.

## Pruebas

- `backend: npm run test:code-generator`: manifiesto, entidades, atributos, métodos, herencia, relaciones JPA, Bean Validation, manejo de errores, compilación Maven real, ZIP, permisos y diagrama vacío.
- `frontend: npm run test:code-generator`: botón, resultado, descarga, contenido ZIP y consola sin errores.
- Las suites completas verifican CU01–CU07, editor, realtime, IA y XMI.

No se modificó Prisma y no se añadió persistencia para artefactos generados. Maven debe estar disponible en `PATH` o indicarse mediante `MAVEN_COMMAND`; `MAVEN_REPOSITORY` permite elegir la caché de dependencias y por defecto usa el directorio temporal del sistema.
