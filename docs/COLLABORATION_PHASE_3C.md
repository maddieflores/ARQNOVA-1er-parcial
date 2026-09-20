# Colaboración en tiempo real — Fase 3C

## Arquitectura

CU06 amplía el namespace Socket.IO `/collaboration` con tres responsabilidades separadas:

- `CollaborationGateway` autentica sockets, valida eventos y administra la entrada/salida de rooms.
- `CollaborationService` mantiene presencia y locks efímeros, publica eventos y limpia recursos.
- Los servicios UML y PostgreSQL siguen siendo la fuente de verdad. `DiagramsController` publica únicamente después de que cada operación REST finaliza correctamente y vuelve a cargar el diagrama persistido.

Cada proyecto usa la room `project:<projectId>`. No existe broadcast global de información UML.

## Autenticación y acceso

El cliente envía el JWT existente mediante `handshake.auth.token`. El middleware del gateway usa `AuthService.authenticate`, por lo que rechaza tokens ausentes, inválidos, expirados y usuarios inactivos.

`project:join` vuelve a validar el acceso mediante `DiagramsService.validateProjectAccess`: solo entra el `ANFITRION` propietario o un `COLABORADOR` activo registrado en `ProjectMember`. El cliente nunca envía un `userId` confiable; la identidad sale del JWT.

## Eventos

Eventos cliente → servidor:

- `project:join`, `project:leave`
- `uml:lock:acquire`, `uml:lock:renew`, `uml:lock:release`

Eventos servidor → room:

- `project:presence`
- `uml:lock:acquired`, `uml:lock:released`
- `uml:class:created|updated|moved|deleted`
- `uml:attribute:created|updated|deleted`
- `uml:method:created|updated|deleted`
- `uml:relation:created|updated|deleted`

Cada cambio UML contiene `projectId`, el diagrama completo confirmado, `originUserId` y `persistedAt`. El cliente originador evita aplicar dos veces su cambio; los demás sustituyen su estado local por el modelo confirmado. Un usuario que llega tarde recibe el estado completo desde PostgreSQL al hacer `project:join`.

## Presencia

La presencia se mantiene en memoria por proyecto y socket. La UI muestra nombre y rol. Varias conexiones del mismo usuario se presentan una sola vez. `project:leave` y `disconnect` retiran la conexión y emiten la lista actualizada.

## Locks

Se bloquean `UML_CLASS` y `UML_RELATION`. El lock de clase cubre también la edición de sus atributos y métodos, evitando granularidad innecesaria.

Cada lock contiene proyecto, tipo e ID de elemento, usuario, socket, nombre, adquisición y expiración. El TTL es de 30 segundos y el cliente renueva cada 15 segundos mientras edita. Un cierre de panel libera el lock; salir, desconectarse o vencer el TTL también lo libera.

Los controladores HTTP consultan el lock antes de actualizar, mover o eliminar. Un usuario distinto recibe `409`, aunque intente saltarse la interfaz. Crear elementos nuevos no requiere lock previo.

## Reconexión y consistencia

El cliente Socket.IO es único y centralizado. Tras reconectar vuelve a autenticarse, se une de nuevo a la room y recibe diagrama, presencia y locks actuales. No intenta reproducir eventos perdidos. React Strict Mode se maneja mediante desconexión diferida y cancelable para evitar desmontajes de prueba que corten una conexión recién reutilizada.

## Pruebas

`backend/test/collaboration.test.cjs` usa Socket.IO real y un esquema PostgreSQL temporal. Comprueba autenticación, acceso, presencia, estado inicial, lock/renovación/conflicto/liberación, TTL, aislamiento de rooms, persistencia previa al broadcast y ausencia de emisión cuando falla una escritura.

`frontend/test/collaboration.browser.cjs` abre dos contextos Playwright independientes: anfitrión y colaborador. Comprueba presencia mutua, creación de clase, atributo, movimiento, relación, bloqueo visible, rechazo concurrente, liberación y reconexión sin recargar manualmente el otro cliente.

No se añadió persistencia de presencia/locks, eventos de IA, XMI ni otras funciones posteriores.
