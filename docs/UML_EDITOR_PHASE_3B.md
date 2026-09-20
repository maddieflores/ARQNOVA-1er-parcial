# Editor UML — Fase 3B

## CU05

CU05 permite que el anfitrión propietario y un colaborador miembro construyan y modifiquen el diagrama principal de un proyecto. El modelo se guarda exclusivamente en PostgreSQL; `localStorage` solo conserva el JWT de sesión.

Al consultar por primera vez `GET /api/projects/:projectId/diagram`, el backend crea de forma idempotente el diagrama principal si todavía no existe. Las consultas posteriores devuelven clases, atributos, métodos y relaciones completas.

## API

Todos los endpoints requieren Bearer JWT y acceso confirmado mediante `ProjectsService.validateAccess`. `DiagramsService.validateProjectAccess` limita CU05 al propietario con rol `ANFITRION` o a un miembro con rol `COLABORADOR`.

- `GET /api/projects/:projectId/diagram`
- `POST /api/projects/:projectId/diagram`
- `POST /api/projects/:projectId/diagram/classes`
- `PATCH /api/projects/:projectId/diagram/classes/:classId`
- `PATCH /api/projects/:projectId/diagram/classes/:classId/position`
- `DELETE /api/projects/:projectId/diagram/classes/:classId`
- `POST /api/projects/:projectId/diagram/classes/:classId/attributes`
- `PATCH|DELETE /api/projects/:projectId/diagram/classes/:classId/attributes/:attributeId`
- `POST /api/projects/:projectId/diagram/classes/:classId/methods`
- `PATCH|DELETE /api/projects/:projectId/diagram/classes/:classId/methods/:methodId`
- `POST /api/projects/:projectId/diagram/relations`
- `PATCH|DELETE /api/projects/:projectId/diagram/relations/:relationId`

Cada operación comprueba además que el elemento pertenece al diagrama indicado por `projectId`. Una clase o relación de otro proyecto responde `404`; una relación con extremos de diagramas distintos responde `400`.

## Editor React Flow

La ruta `/projects/:id/editor` presenta:

- encabezado del diagrama y estado de guardado;
- herramientas y listado de relaciones;
- canvas React Flow con controles, minimapa y fondo;
- panel de propiedades para clases o relaciones;
- nodo UML personalizado con nombre, atributos y métodos;
- símbolos `+`, `-`, `#` y `~` para las visibilidades UML.

Una clase se crea primero en backend y luego aparece en el canvas. El movimiento se persiste en `onNodeDragStop`, evitando una solicitud por cada píxel. Si falla una operación crítica, el editor vuelve a cargar el modelo persistido.

Las relaciones se crean conectando nodos o seleccionando origen y destino en el panel. Asociación, agregación, composición, herencia y dependencia se distinguen mediante grosor, flecha, animación o trazo discontinuo. La etiqueta del edge muestra multiplicidades y nombre/tipo. Los valores admitidos incluyen `1`, `0..1`, `*`, `0..*` y `1..*`.

## Persistencia e integridad

Al recargar, el frontend reconstruye nodos y edges mediante `diagramToFlow`. No conserva una copia del diagrama en almacenamiento del navegador. Eliminar una clase borra sus relaciones dentro de una transacción y sus atributos/métodos mediante las relaciones Prisma definidas en 3A.

No se añadió broadcast Socket.IO, bloqueo, presencia ni cursores remotos. Estas capacidades pertenecen a CU06.

## Pruebas

- `npm run test:uml-editor` en backend valida la API HTTP en un esquema PostgreSQL temporal: acceso, CRUD completo, posiciones, cinco tipos de relación, multiplicidades, aislamiento y eliminación segura.
- `npm run test:uml-editor` en frontend recorre el editor con Playwright: creación, edición, drag, atributos, métodos, relación, recarga, edición/eliminación y acceso del colaborador.
- Las pruebas de Fases 0–3A se ejecutan como regresión antes del cierre.

No fue necesaria una migración nueva: Fase 3B reutiliza íntegramente el esquema de `20260920015535_add_uml_model`.
