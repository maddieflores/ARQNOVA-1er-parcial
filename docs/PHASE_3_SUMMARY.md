# Cierre de Fase 3

## Objetivo y trazabilidad

La Fase 3 implementa y valida:

- **CU05 — Diseñar y gestionar diagrama de clases UML:** modelos persistentes, API UML y editor React Flow.
- **CU06 — Colaborar en tiempo real:** autenticación Socket.IO, rooms, presencia, sincronización y control temporal de edición.

No incluye IA, XMI, diseño de datos, generación Spring Boot ni funciones móviles.

## Arquitectura UML y persistencia

Cada `Project` tiene un diagrama principal `Diagram`. El diagrama contiene `UmlClass` y `UmlRelation`; cada clase contiene `UmlAttribute` y `UmlMethod`. Las relaciones referencian clases de origen y destino del mismo diagrama. Los enums `UmlVisibility` y `UmlRelationType` mantienen valores consistentes.

Las coordenadas `x` e `y` se guardan al terminar el drag (`onNodeDragStop`), evitando solicitudes por cada píxel. Eliminar una clase trata sus atributos, métodos y relaciones asociadas de forma transaccional. Los servicios comprueban pertenencia al diagrama y evitan referencias entre proyectos.

PostgreSQL es la fuente de verdad. El frontend no guarda el modelo UML en `localStorage`: al abrir o recargar transforma el diagrama obtenido por REST a nodos y edges mediante `diagramToFlow`.

## API y autorización

La API se publica bajo `/api/projects/:projectId/diagram` y comprende:

- `GET|POST /diagram`
- `POST /diagram/classes`
- `PATCH|DELETE /diagram/classes/:classId`
- `PATCH /diagram/classes/:classId/position`
- `POST /diagram/classes/:classId/attributes`
- `PATCH|DELETE /diagram/classes/:classId/attributes/:attributeId`
- `POST /diagram/classes/:classId/methods`
- `PATCH|DELETE /diagram/classes/:classId/methods/:methodId`
- `POST /diagram/relations`
- `PATCH|DELETE /diagram/relations/:relationId`

Todos requieren JWT y usuario activo. `DiagramsService.validateProjectAccess` permite al `ANFITRION` propietario y al `COLABORADOR` miembro activo. Un usuario externo o `ADMINISTRADOR` sin membresía funcional queda bloqueado. Los DTO validan payloads y los servicios vuelven a comprobar que cada elemento pertenece al proyecto indicado.

## Arquitectura realtime

`CollaborationGateway` opera en el namespace `/collaboration`; autentica el JWT del handshake mediante `AuthService` y valida acceso al proyecto antes de unir un socket a `project:<projectId>`. `CollaborationService` mantiene en memoria presencia y locks efímeros. `DiagramsController` persiste primero, recarga el diagrama confirmado y después publica a la room correspondiente.

Eventos cliente a servidor:

- `project:join`, `project:leave`
- `uml:lock:acquire`, `uml:lock:renew`, `uml:lock:release`

Eventos servidor a clientes:

- `project:presence`
- `uml:lock:acquired`, `uml:lock:released`
- `uml:class:created`, `uml:class:updated`, `uml:class:moved`, `uml:class:deleted`
- `uml:attribute:created`, `uml:attribute:updated`, `uml:attribute:deleted`
- `uml:method:created`, `uml:method:updated`, `uml:method:deleted`
- `uml:relation:created`, `uml:relation:updated`, `uml:relation:deleted`

Cada cambio incluye `projectId`, diagrama confirmado, `originUserId` y `persistedAt`. No hay broadcast global.

## Presencia, locks y reconexión

La presencia se registra por proyecto y socket, y se deduplica por usuario en la interfaz. Los locks cubren `UML_CLASS` y `UML_RELATION`; el lock de clase incluye la edición de atributos y métodos.

Un lock identifica proyecto, tipo e ID de elemento, usuario, socket, adquisición y expiración. Dura 30 segundos y se renueva cada 15 segundos mientras el panel continúa abierto. Se libera al cerrar el panel, abandonar la room, desconectarse o vencer el TTL. Un cambio HTTP bloqueado por otro usuario responde `409`.

Tras una reconexión, el cliente vuelve a autenticarse y a unirse a la room. Recupera desde backend el diagrama persistido, la presencia y los locks actuales; no depende de reproducir eventos perdidos.

## Migración

La estructura UML fue incorporada por `20260920015535_add_uml_model`. CU05 y CU06 reutilizan ese esquema; presencia y locks son efímeros, por lo que CU06 no requiere migración adicional.

## Validación de cierre

- Suite backend completa: autenticación, seguridad, usuarios, proyectos, participantes, modelo UML, editor y colaboración.
- Suite Playwright completa: CU01 a CU06.
- Prueba CU06 con dos contextos autenticados: presencia, cambios bidireccionales, lock, liberación y reconexión.
- Builds backend y frontend.
- Prisma `format`, `validate`, `generate` y `migrate status`.
- Seed ejecutado dos veces para comprobar idempotencia.
- Health, Docker Compose y PostgreSQL en `localhost:5433`.

## Limitaciones conocidas

La presencia y los locks viven en memoria de una única instancia NestJS, apropiado para la arquitectura actual sin microservicios. Reiniciar el backend los limpia y los clientes recuperan el estado persistido al reconectar. No existen cursores remotos ni animación continua durante el drag; el movimiento se sincroniza al finalizar para priorizar consistencia. El build de Vite puede advertir que el bundle principal supera 500 kB; no afecta la ejecución y su optimización queda fuera del cierre funcional.
