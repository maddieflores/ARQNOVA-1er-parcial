import { useCallback, useEffect, useMemo, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from '@xyflow/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthProvider'
import { diagramToFlow, flowNodeToMovePayload, type UmlClassNodeData, type UmlRelationEdgeData } from '../modules/uml/mappers'
import { UmlClassNode } from '../modules/uml/UmlClassNode'
import { UmlPropertiesPanel } from '../modules/uml/UmlPropertiesPanel'
import { umlService, type UmlAttributeInput, type UmlMethodInput, type UmlRelationInput } from '../modules/uml/uml-service'
import type { Diagram, UmlClass, UmlRelation, UmlRelationType } from '../modules/uml/types'
import { ApiError } from '../services/http'

const nodeTypes = { umlClass: UmlClassNode }
const relationTypes: UmlRelationType[] = ['ASSOCIATION', 'AGGREGATION', 'COMPOSITION', 'INHERITANCE', 'DEPENDENCY']
const multiplicities = ['1', '0..1', '*', '0..*', '1..*']

export function UmlEditorPage() {
  const { id = '' } = useParams(); const { user } = useAuth(); const navigate = useNavigate()
  const [diagram, setDiagram] = useState<Diagram | null>(null); const [nodes, setNodes, onNodesChange] = useNodesState<Node<UmlClassNodeData>>([]); const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<UmlRelationEdgeData>>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null)
  const [relationDraft, setRelationDraft] = useState<UmlRelationInput>({ sourceClassId: '', targetClassId: '', type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' })

  const apply = useCallback((value: Diagram) => { const flow = diagramToFlow(value); setDiagram(value); setNodes(flow.nodes); setEdges(flow.edges) }, [setEdges, setNodes])
  const load = useCallback(async (signal?: AbortSignal) => { const value = await umlService.get(id, signal); apply(value) }, [apply, id])
  useEffect(() => { const controller = new AbortController(); setLoading(true); load(controller.signal).catch(failure => { if (!controller.signal.aborted) { if (failure instanceof ApiError && failure.status === 403) navigate('/dashboard', { replace: true }); else setError(messageFor(failure)) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [load, navigate])

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setSaving(true); setError(null); setMessage(null)
    try { await operation(); await load(); setMessage(success); return true } catch (failure) { setError(messageFor(failure)); return false } finally { setSaving(false) }
  }
  const selectedClass = diagram?.classes.find(item => item.id === selectedClassId) ?? null
  const selectedRelation = diagram?.relations.find(item => item.id === selectedRelationId) ?? null
  useEffect(() => { if (selectedRelation) setRelationDraft({ sourceClassId: selectedRelation.sourceClassId, targetClassId: selectedRelation.targetClassId, type: selectedRelation.type, sourceMultiplicity: selectedRelation.sourceMultiplicity, targetMultiplicity: selectedRelation.targetMultiplicity, label: selectedRelation.label ?? '' }) }, [selectedRelation])

  const createClass = () => run(async () => { const count = diagram?.classes.length ?? 0; const created = await umlService.createClass(id, { name: `NuevaClase${count + 1}`, x: 80 + count * 40, y: 80 + count * 40 }); setSelectedClassId(created.id) }, 'Clase creada y guardada.')
  const onConnect = (connection: Connection) => { if (!connection.source || !connection.target) return; setSelectedRelationId(null); setSelectedClassId(null); setRelationDraft({ sourceClassId: connection.source, targetClassId: connection.target, type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' }) }
  const saveRelation = async () => {
    if (!relationDraft.sourceClassId || !relationDraft.targetClassId) { setError('Selecciona las clases de origen y destino.'); return }
    const update = { type: relationDraft.type, sourceMultiplicity: relationDraft.sourceMultiplicity, targetMultiplicity: relationDraft.targetMultiplicity, label: relationDraft.label }
    if (await run(() => selectedRelation ? umlService.updateRelation(id, selectedRelation.id, update) : umlService.createRelation(id, relationDraft), selectedRelation ? 'Relación actualizada.' : 'Relación creada.')) setSelectedRelationId(null)
  }
  const returnTo = user?.role.name === 'COLABORADOR' ? '/shared-projects' : `/projects/${id}`

  if (loading) return <p role="status" className="p-6">Cargando editor UML…</p>
  if (!diagram) return <section className="p-6"><h1 className="text-xl font-bold">Editor no disponible</h1><p role="alert" className="mt-3 text-red-700">{error}</p></section>
  return <section className="flex h-[calc(100vh-81px)] min-h-[620px] flex-col bg-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><div><Link className="text-sm text-blue-700 underline" to={returnTo}>← Volver</Link><h1 className="text-xl font-bold">Editor UML · {diagram.name}</h1></div><div className="flex items-center gap-3"><span className="text-sm text-slate-600">{saving ? 'Guardando…' : 'Cambios persistidos'}</span><button disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void createClass()}>Nueva clase</button></div></header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={`mx-4 mt-2 rounded px-3 py-2 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{error ?? message}</div>}
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full border-r bg-white p-3 lg:w-64"><h2 className="font-semibold">Herramientas</h2><button className="mt-3 w-full rounded border px-3 py-2 text-sm" onClick={() => { setSelectedClassId(null); setSelectedRelationId(null); setRelationDraft({ sourceClassId: '', targetClassId: '', type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' }) }}>Nueva relación</button><p className="mt-3 text-xs text-slate-500">También puedes conectar los manejadores de dos clases.</p><h3 className="mt-5 text-sm font-semibold">Relaciones</h3><ul className="mt-2 space-y-1">{diagram.relations.map(relation => <li key={relation.id}><button className="w-full rounded bg-slate-50 p-2 text-left text-xs" onClick={() => { setSelectedRelationId(relation.id); setSelectedClassId(null) }}>{relation.label || relation.type}</button></li>)}</ul></aside>
      <div className="relative min-h-[420px] flex-1"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView onNodeClick={(_, node) => { setSelectedClassId(node.id); setSelectedRelationId(null) }} onEdgeClick={(_, edge) => { setSelectedRelationId(edge.id); setSelectedClassId(null) }} onNodeDragStop={(_, node) => { void (async () => { if (!await run(() => umlService.moveClass(id, node.id, flowNodeToMovePayload(node)), 'Posición guardada.')) await load() })() }}><Background/><MiniMap/><Controls/></ReactFlow>{diagram.classes.length === 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><p className="rounded bg-white/90 p-4 text-slate-600 shadow">El diagrama está vacío. Crea tu primera clase.</p></div>}</div>
      {selectedClass && <UmlPropertiesPanel umlClass={selectedClass} disabled={saving}
        onUpdateClass={value => run(() => umlService.updateClass(id, selectedClass.id, value), 'Clase actualizada.')}
        onDeleteClass={async () => { if (await run(() => umlService.removeClass(id, selectedClass.id), 'Clase eliminada.')) setSelectedClassId(null) }}
        onCreateAttribute={value => run(() => umlService.createAttribute(id, selectedClass.id, value), 'Atributo agregado.')}
        onUpdateAttribute={(attributeId, value) => run(() => umlService.updateAttribute(id, selectedClass.id, attributeId, value), 'Atributo actualizado.')}
        onDeleteAttribute={attributeId => run(() => umlService.removeAttribute(id, selectedClass.id, attributeId), 'Atributo eliminado.')}
        onCreateMethod={value => run(() => umlService.createMethod(id, selectedClass.id, value), 'Método agregado.')}
        onUpdateMethod={(methodId, value) => run(() => umlService.updateMethod(id, selectedClass.id, methodId, value), 'Método actualizado.')}
        onDeleteMethod={methodId => run(() => umlService.removeMethod(id, selectedClass.id, methodId), 'Método eliminado.')}/>} 
      {!selectedClass && <RelationPanel classes={diagram.classes} relation={selectedRelation} draft={relationDraft} setDraft={setRelationDraft} disabled={saving} onSave={saveRelation} onDelete={selectedRelation ? async () => { if (confirm('¿Eliminar esta relación?') && await run(() => umlService.removeRelation(id, selectedRelation.id), 'Relación eliminada.')) setSelectedRelationId(null) } : undefined}/>} 
    </div>
  </section>
}

function RelationPanel({ classes, relation, draft, setDraft, disabled, onSave, onDelete }: { classes: UmlClass[]; relation: UmlRelation | null; draft: UmlRelationInput; setDraft: (value: UmlRelationInput) => void; disabled: boolean; onSave: () => Promise<void>; onDelete?: () => Promise<void> }) {
  const update = (value: Partial<UmlRelationInput>) => setDraft({ ...draft, ...value })
  return <aside className="w-full overflow-y-auto border-l bg-white p-4 lg:w-80" aria-label="Propiedades de relación"><h2 className="text-lg font-bold">{relation ? 'Editar relación' : 'Nueva relación'}</h2><div className="mt-3 space-y-3">
    <label className="block text-sm">Origen<select aria-label="Clase de origen" className="mt-1 w-full rounded border p-2" value={draft.sourceClassId} disabled={Boolean(relation)} onChange={event => update({ sourceClassId: event.target.value })}><option value="">Seleccionar</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm">Destino<select aria-label="Clase de destino" className="mt-1 w-full rounded border p-2" value={draft.targetClassId} disabled={Boolean(relation)} onChange={event => update({ targetClassId: event.target.value })}><option value="">Seleccionar</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm">Tipo<select aria-label="Tipo de relación" className="mt-1 w-full rounded border p-2" value={draft.type} onChange={event => update({ type: event.target.value as UmlRelationType })}>{relationTypes.map(value => <option key={value}>{value}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-sm">Multiplicidad origen<select aria-label="Multiplicidad de origen" className="mt-1 w-full rounded border p-2" value={draft.sourceMultiplicity} onChange={event => update({ sourceMultiplicity: event.target.value })}>{multiplicities.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-sm">Multiplicidad destino<select aria-label="Multiplicidad de destino" className="mt-1 w-full rounded border p-2" value={draft.targetMultiplicity} onChange={event => update({ targetMultiplicity: event.target.value })}>{multiplicities.map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label className="block text-sm">Etiqueta<input aria-label="Etiqueta de relación" className="mt-1 w-full rounded border p-2" maxLength={120} value={draft.label ?? ''} onChange={event => update({ label: event.target.value || undefined })}/></label>
    <button disabled={disabled || classes.length < 1} className="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50" onClick={() => void onSave()}>{relation ? 'Guardar relación' : 'Crear relación'}</button>{onDelete && <button className="w-full rounded border border-red-600 px-3 py-2 text-red-700" onClick={() => void onDelete()}>Eliminar relación</button>}
  </div></aside>
}

function messageFor(failure: unknown) { return failure instanceof ApiError ? failure.message : 'No se pudo completar la operación. Intenta nuevamente.' }
