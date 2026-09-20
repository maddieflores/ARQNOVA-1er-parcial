import type { Edge, Node } from '@xyflow/react'
import type { Diagram, MoveUmlClassPayload, UmlClass, UmlRelation } from './types'

export type UmlClassNodeData = { umlClass: UmlClass } & Record<string, unknown>
export type UmlRelationEdgeData = { relation: UmlRelation } & Record<string, unknown>

export interface DiagramFlowModel {
  nodes: Node<UmlClassNodeData>[]
  edges: Edge<UmlRelationEdgeData>[]
}

export function diagramToFlow(diagram: Diagram): DiagramFlowModel {
  return {
    nodes: diagram.classes.map(umlClass => ({
      id: umlClass.id,
      position: { x: umlClass.x, y: umlClass.y },
      data: { umlClass },
      ...(umlClass.width == null ? {} : { width: umlClass.width }),
      ...(umlClass.height == null ? {} : { height: umlClass.height }),
    })),
    edges: diagram.relations.map(relation => ({
      id: relation.id,
      source: relation.sourceClassId,
      target: relation.targetClassId,
      label: relation.label ?? `${relation.sourceMultiplicity} — ${relation.targetMultiplicity}`,
      data: { relation },
    })),
  }
}

export function flowNodeToMovePayload(node: Pick<Node, 'position'>): MoveUmlClassPayload {
  return { x: node.position.x, y: node.position.y }
}
