# Base UML — Fase 3A

## Alcance y decisión de diseño

La Fase 3A prepara la persistencia y los servicios internos de CU05 sin implementar el editor visual. Cada proyecto tiene un único diagrama principal (`Diagram.projectId` es único). Esta decisión simplifica el alcance actual y puede ampliarse mediante una migración si más adelante se requieren varios diagramas por proyecto.

## Modelo persistente

- `Project` → `Diagram`: uno a cero/uno. El proyecto no puede eliminarse físicamente mientras conserve un diagrama; ARQNOVA usa borrado lógico de proyectos.
- `Diagram` → `UmlClass`: un diagrama contiene clases.
- `UmlClass` → `UmlAttribute` y `UmlMethod`: una clase contiene atributos y métodos ordenados mediante `position`.
- `Diagram` → `UmlRelation`: un diagrama contiene relaciones.
- `UmlRelation` referencia una clase de origen y una de destino. El servicio comprueba que ambas pertenezcan al diagrama de la relación.

`UmlClass.x` y `UmlClass.y` son valores `Float` persistentes compatibles con la posición de nodos de React Flow. `width` y `height` son opcionales.

Los enums son:

- `UmlVisibility`: `PUBLIC`, `PRIVATE`, `PROTECTED`, `PACKAGE`.
- `UmlRelationType`: `ASSOCIATION`, `AGGREGATION`, `COMPOSITION`, `INHERITANCE`, `DEPENDENCY`.

Las multiplicidades aceptan un valor único, `*` o un intervalo como `0..1`, `0..*` y `1..*`. No se interpreta semánticamente la expresión en esta fase.

## Servicios y acceso

- `DiagramsService`: crea, carga con toda su estructura y valida acceso.
- `UmlClassesService`: crea, consulta, actualiza, mueve y elimina clases.
- `UmlAttributesService`: crea, lista, actualiza y elimina atributos.
- `UmlMethodsService`: crea, lista, actualiza y elimina métodos.
- `UmlRelationsService`: crea, lista, actualiza y elimina relaciones, validando sus extremos.

Todos los servicios reutilizan `ProjectsService.validateAccess`. Tienen acceso el propietario activo y un miembro activo de `ProjectMember`; un usuario ajeno recibe `403`. Eliminar una clase ejecuta una transacción que elimina primero sus relaciones. Sus atributos y métodos se eliminan por cascada.

La API mínima expuesta en esta fase es:

- `POST /api/projects/:projectId/diagram`: crea el diagrama principal para un usuario con acceso al proyecto.
- `GET /api/projects/:projectId/diagram`: carga clases, atributos, métodos y relaciones del diagrama.

Ambos endpoints requieren JWT. Los CRUD visuales quedan reservados para Fase 3B.

## Preparación de React Flow

`frontend/src/modules/uml/types.ts` define el contrato del modelo. `mappers.ts` convierte un diagrama del backend en nodos y aristas de `@xyflow/react` y convierte la posición de un nodo en el payload de movimiento. No se añadió editor, toolbar, drag and drop ni eventos colaborativos.

## Migración y validación

Migración: `20260920015535_add_uml_model`.

Comandos:

```bash
cd backend
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run test:uml-base
```

La prueba usa un esquema PostgreSQL temporal y comprueba creación y acceso al diagrama, persistencia de posición, atributos, métodos, relaciones, rechazo de extremos inválidos o cruzados, carga completa y eliminación segura de una clase. Las pruebas anteriores se ejecutan como regresión antes del cierre de la fase.
