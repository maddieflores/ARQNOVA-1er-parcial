# Fase 4B — CU07 Modelar mediante Inteligencia Artificial

## Flujo

El anfitrión propietario y el colaborador miembro pueden abrir `/projects/:id/ai-proposal`, escribir una descripción, generar una propuesta estructurada y revisarla. La propuesta no modifica el diagrama hasta que el usuario pulsa **Aplicar al diagrama**. **Cancelar** descarta solamente la propuesta local.

## Aplicación aditiva

`POST /api/projects/:projectId/ai/apply-uml-proposal` recibe `{ proposal }`. `AiUmlApplyService` vuelve a validar estructura, semántica y acceso contra el estado actual. El modo es aditivo: crea clases, atributos, métodos y relaciones, sin modificar ni eliminar elementos existentes. Un nombre de clase ya presente y los duplicados internos se rechazan; no hay sobrescritura silenciosa.

La aplicación se ejecuta en una transacción Prisma con aislamiento serializable. Un fallo revierte el conjunto completo. Las clases se distribuyen en una cuadrícula de cuatro columnas, debajo de la mayor coordenada `y` existente, con separación fija compatible con React Flow.

## Integración con CU05 y CU06

La propuesta crea directamente `UmlClass`, `UmlAttribute`, `UmlMethod` y `UmlRelation`; no existen entidades de IA paralelas. Tras confirmar la transacción, el backend recarga el diagrama persistido y publica `uml:diagram:updated` en la room `project:<projectId>`. Los editores conectados reutilizan el cliente realtime de CU06 y reconstruyen nodes/edges con el mismo mapper de CU05. Un error de validación o persistencia no genera broadcast.

## Seguridad

- JWT y usuario activo son obligatorios.
- `DiagramsService.validateProjectAccess` permite solo anfitrión propietario o colaborador miembro.
- ADMINISTRADOR y usuarios externos no reciben acceso automático.
- El payload se valida con `class-validator`; solo se procesan datos UML y nunca se ejecuta código de la IA.
- El proveedor continúa encapsulado por `AiProvider`; las pruebas usan `MockAiProvider` y no requieren Internet ni una clave.
- El diagrama se revalida al aplicar para cubrir cambios ocurridos desde la generación.

## Endpoints

- `POST /api/projects/:projectId/ai/uml-proposal`: genera y valida una propuesta sin persistirla.
- `POST /api/projects/:projectId/ai/apply-uml-proposal`: confirma y persiste la propuesta de forma atómica.

## Pruebas

- Backend: `npm run test:ai-uml` cubre acceso, anfitrión/colaborador, persistencia completa, modo aditivo, posiciones, conflicto por estado actual, propuestas inválidas, rollback y orden persistencia/broadcast.
- Frontend: `npm run test:ai-uml` usa dos contextos Playwright para cancelar, aplicar, verificar preview, recibir cambios realtime, abrir el editor y recargar desde PostgreSQL.

No se implementaron imagen, OCR, voz, XMI, diseño de datos, generación de backend ni móvil.
