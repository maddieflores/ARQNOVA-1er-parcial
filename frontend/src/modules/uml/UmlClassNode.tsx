import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { UmlClassNodeData } from './mappers'
import type { UmlVisibility } from './types'

const symbol: Record<UmlVisibility, string> = { PUBLIC: '+', PRIVATE: '-', PROTECTED: '#', PACKAGE: '~' }

export function UmlClassNode({ data, selected }: NodeProps) {
  const umlClass = (data as UmlClassNodeData).umlClass
  return <div className={`min-w-56 rounded border-2 bg-white text-xs shadow ${selected ? 'border-blue-600' : 'border-slate-700'}`}>
    <Handle type="target" position={Position.Top}/>
    <div className={`px-3 py-2 text-center text-sm font-bold ${umlClass.isAbstract ? 'italic' : ''}`}>{umlClass.name}</div>
    <div className="min-h-8 border-t border-slate-500 px-3 py-2">
      {umlClass.attributes.length === 0 ? <span className="text-slate-400">Sin atributos</span> : umlClass.attributes.map(attribute => <div key={attribute.id}>{symbol[attribute.visibility]} {attribute.name}: {attribute.type}{attribute.isPrimaryKey ? ' {PK}' : ''}</div>)}
    </div>
    <div className="min-h-8 border-t border-slate-500 px-3 py-2">
      {umlClass.methods.length === 0 ? <span className="text-slate-400">Sin métodos</span> : umlClass.methods.map(method => <div key={method.id}>{symbol[method.visibility]} {method.name}(): {method.returnType}</div>)}
    </div>
    <Handle type="source" position={Position.Bottom}/>
    {(data as UmlClassNodeData).lockedBy && <div className="absolute -right-2 -top-3 rounded bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900 shadow">Editando: {(data as UmlClassNodeData).lockedBy}</div>}
  </div>
}
