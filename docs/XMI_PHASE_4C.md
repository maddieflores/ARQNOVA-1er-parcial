# Fase 4C — Interoperabilidad UML mediante XMI

## Arquitectura

`XmiModule` encapsula `XmiController` y `XmiService`. El módulo reutiliza `DiagramsService.validateProjectAccess`, las entidades UML persistentes y `CollaborationService`; no añade tablas ni crea un modelo paralelo.

La implementación usa XMI 2.5.1 con namespaces XMI/UML. Exporta `uml:Model`, `uml:PrimitiveType`, `uml:Class`, propiedades, operaciones y relaciones. Las posiciones de React Flow y la marca de clave primaria se conservan mediante atributos en el namespace de extensión `arqnova`, sin sustituir los elementos UML estándar.

## Endpoints

- `GET /api/projects/:projectId/xmi/export`: descarga `application/xml` con extensión `.xmi`.
- `POST /api/projects/:projectId/xmi/import`: recibe multipart/form-data en el campo `file`; acepta `.xmi` y `.xml` hasta 2 MB.

Ambos endpoints exigen JWT, usuario activo y acceso al proyecto como anfitrión propietario o colaborador miembro.

## Exportación

El servicio carga el diagrama completo desde PostgreSQL y genera clases, atributos, métodos, tipos primitivos, relaciones, etiquetas y multiplicidades. Asociación, agregación, composición, herencia y dependencia se representan con elementos UML y extremos tipados. Los nombres de archivo se normalizan.

## Importación

1. Valida extensión, tamaño y XML bien formado.
2. Localiza el modelo UML y convierte clases, propiedades, operaciones y relaciones al modelo interno.
3. Rechaza clases, atributos, métodos o relaciones duplicados; referencias inexistentes; visibilidades y multiplicidades inválidas.
4. Reemplaza el contenido del diagrama dentro de una transacción Prisma serializable.
5. Recarga el diagrama persistido y emite `uml:diagram:updated` a la room del proyecto.

La importación se rechaza si existen locks activos en el proyecto. Cualquier error previo o durante la transacción conserva íntegramente el modelo anterior.

## Frontend

La barra del editor incorpora **Exportar XMI** e **Importar XMI**. La importación requiere confirmación porque reemplaza el contenido actual. Al finalizar, React Flow usa la respuesta persistida y los demás clientes reciben la actualización por el canal realtime existente.

## Pruebas

- `backend: npm run test:xmi`: XML exportado, round trip completo, atributos, métodos, relaciones, multiplicidades, permisos, XML inválido, referencias inválidas y rollback.
- `frontend: npm run test:xmi`: descarga, selección de archivo, confirmación, actualización del canvas y errores controlados sin fallos JavaScript.
- Las suites completas backend/frontend validan regresión de CU01–CU07, editor, realtime e IA.

## Alcance de compatibilidad

Se implementa el subconjunto de diagramas de clases que maneja ARQNOVA. No se pretende cubrir todos los perfiles, diagramas o extensiones propietarias de Enterprise Architect. Los elementos UML estándar y sus identificadores permiten intercambio básico con herramientas CASE; las extensiones ARQNOVA son opcionales para otras herramientas.
