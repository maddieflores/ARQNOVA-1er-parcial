# Base técnica de Inteligencia Artificial — Fase 4A

## Alcance

Fase 4A prepara la generación de propuestas estructuradas para CU07. Recibe una descripción textual, genera y valida una propuesta UML, y la devuelve para revisión. No escribe clases, atributos, métodos ni relaciones en PostgreSQL y no modifica React Flow.

## Arquitectura

El flujo es: usuario → `AiController` → `AiService` → `AiUmlProposalService` → `AiProvider` → parser y validación → propuesta. La interfaz `AiProvider` desacopla la aplicación de cualquier proveedor externo.

`MockAiProvider` es el proveedor disponible en esta fase. Devuelve de forma determinista clases `Cliente` y `Pedido` con una asociación, permitiendo desarrollo y pruebas sin Internet, claves ni consumo externo. Una configuración diferente usa `UnavailableAiProvider` y responde con un error controlado; no se instaló ningún SDK.

La constante `UML_PROPOSAL_SYSTEM_PROMPT` deja preparado el contrato futuro: JSON puro, sin Markdown ni explicaciones y ajustado al schema UML.

## Schema y validación

`AiUmlProposalDto` contiene clases y relaciones. Cada clase contiene atributos y métodos. Se reutilizan los enums Prisma `UmlVisibility` y `UmlRelationType`.

La validación estructural usa `class-validator`/`class-transformer`, limita cantidades y longitudes, rechaza campos inesperados, visibilidades, tipos de relación y multiplicidades inválidas. La validación semántica rechaza clases, atributos o métodos duplicados y relaciones dirigidas a clases inexistentes.

Nunca se ejecuta código recibido del proveedor ni se interpreta texto libre como consultas o comandos.

## Endpoint y seguridad

`POST /api/projects/:projectId/ai/uml-proposal`

```json
{ "prompt": "Crea una clase Cliente y una clase Pedido" }
```

El prompt es obligatorio y admite hasta 2000 caracteres. El endpoint requiere Bearer JWT, usuario activo y acceso a CU05: `ANFITRION` propietario o `COLABORADOR` miembro. Un usuario externo o administrador sin acceso recibe `403`. La identidad procede del JWT.

La respuesta contiene `{ "proposal": ... }`. No contiene secretos ni datos internos y no persiste el resultado. Errores de formato del proveedor producen `502`, proveedor no disponible `503` y timeout `504`, sin revelar respuestas privadas ni claves.

## Configuración

Variables de backend:

- `AI_PROVIDER=mock`
- `AI_API_KEY=` reservado para un proveedor futuro; nunca se versiona un valor real.
- `AI_MODEL=` reservado para configuración futura.
- `AI_TIMEOUT_MS=10000`, entre 100 y 120000 ms.

## Frontend

La ruta `/projects/:id/ai-proposal` muestra un textarea, contador, estado de carga y un resumen de clases, atributos, métodos y relaciones. La vista declara expresamente que la propuesta no modifica el diagrama. Anfitriones acceden desde el detalle del proyecto y colaboradores desde proyectos compartidos.

## Pruebas

- Backend: acceso, JWT, mock, prompts inválidos, ausencia de persistencia, JSON vacío/inválido, duplicados, referencias, multiplicidades, campos inesperados, error externo y timeout.
- Frontend: formulario, propuesta visible, anfitrión/colaborador, usuario externo, error de red, consola y comprobación directa de que no se creó un diagrama.
- Regresión: suites CU01–CU06, builds y Prisma.

## Limitaciones

No existe aplicación de propuestas al diagrama, chat, comandos iterativos, voz ni reconstrucción desde imagen. El mock no intenta interpretar lenguaje natural; sirve para validar el contrato y la arquitectura antes de integrar un proveedor real en una fase autorizada.
