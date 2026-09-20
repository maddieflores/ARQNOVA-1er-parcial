import { useCallback, useEffect, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from '@xyflow/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../modules/auth/AuthProvider'
import { diagramToFlow, flowNodeToMovePayload, type UmlClassNodeData, type UmlRelationEdgeData } from '../modules/uml/mappers'
import { UmlClassNode } from '../modules/uml/UmlClassNode'
import { UmlPropertiesPanel } from '../modules/uml/UmlPropertiesPanel'
import { umlService, type UmlAttributeInput, type UmlMethodInput, type UmlRelationInput } from '../modules/uml/uml-service'
import type { Diagram, UmlClass, UmlRelation, UmlRelationType } from '../modules/uml/types'
import { ApiError } from '../services/http'
import { collaborationService, type LockElementType, type PresenceUser, type ProjectLock } from '../modules/collaboration/collaboration-service'
import { sessionStore } from '../modules/auth/session-store'

const nodeTypes = { umlClass: UmlClassNode }
const relationTypes: UmlRelationType[] = ['ASSOCIATION', 'AGGREGATION', 'COMPOSITION', 'INHERITANCE', 'DEPENDENCY']
const multiplicities = ['1', '0..1', '*', '0..*', '1..*']

export function UmlEditorPage() {
  const { id = '' } = useParams(); const { user } = useAuth(); const navigate = useNavigate()
  const [diagram, setDiagram] = useState<Diagram | null>(null); const [nodes, setNodes, onNodesChange] = useNodesState<Node<UmlClassNodeData>>([]); const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<UmlRelationEdgeData>>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null)
  const [relationDraft, setRelationDraft] = useState<UmlRelationInput>({ sourceClassId: '', targetClassId: '', type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' })
  const [presence, setPresence] = useState<PresenceUser[]>([]); const [locks, setLocks] = useState<ProjectLock[]>([]); const [realtimeConnected, setRealtimeConnected] = useState(false); const [realtimeReady, setRealtimeReady] = useState(false)
  const [selectionPending, setSelectionPending] = useState(false)

  const apply = useCallback((value: Diagram) => { const flow = diagramToFlow(value); setDiagram(value); setNodes(flow.nodes); setEdges(flow.edges) }, [setEdges, setNodes])
  const load = useCallback(async (signal?: AbortSignal) => { const value = await umlService.get(id, signal); apply(value) }, [apply, id])
  useEffect(() => { const controller = new AbortController(); setLoading(true); load(controller.signal).catch(failure => { if (!controller.signal.aborted) { if (failure instanceof ApiError && failure.status === 403) navigate('/dashboard', { replace: true }); else setError(messageFor(failure)) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [load, navigate])
  useEffect(() => {
    const token = sessionStore.getToken(); if (!token) return
    const offPresence = collaborationService.onPresence(setPresence); const offLocks = collaborationService.onLocks(value => { setLocks(value); setError(current => current?.startsWith('Editando:') ? null : current) }); const offStatus = collaborationService.onStatus(setRealtimeConnected); const offReady = collaborationService.onReady(setRealtimeReady)
    const offChange = collaborationService.onChange(change => { if (change.projectId === id && change.originUserId !== user?.id) apply(change.diagram) })
    collaborationService.connect(token); void collaborationService.join(id).then(value => { if (value) apply(value) }).catch(failure => setError(messageFor(failure)))
    return () => { offPresence(); offLocks(); offStatus(); offReady(); offChange(); collaborationService.scheduleDisconnect() }
  }, [apply, id, user?.id])
  useEffect(() => { setNodes(current => current.map(node => ({ ...node, data: { ...node.data, lockedBy: locks.find(lock => lock.elementType === 'UML_CLASS' && lock.elementId === node.id && lock.userId !== user?.id)?.userName } }))) }, [diagram, locks, setNodes, user?.id])

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setSaving(true); setError(null); setMessage(null)
    try { await operation(); await load(); setMessage(success); return true } catch (failure) { setError(messageFor(failure)); return false } finally { setSaving(false) }
  }
  const selectedClass = diagram?.classes.find(item => item.id === selectedClassId) ?? null
  const selectedRelation = diagram?.relations.find(item => item.id === selectedRelationId) ?? null

  const createClass = () => run(async () => { const count = diagram?.classes.length ?? 0; const created = await umlService.createClass(id, { name: `NuevaClase${count + 1}`, x: 80 + count * 40, y: 80 + count * 40 }); await collaborationService.acquire('UML_CLASS', created.id); setSelectedClassId(created.id) }, 'Clase creada y guardada.')
  const onConnect = (connection: Connection) => { if (!connection.source || !connection.target) return; setSelectedRelationId(null); setSelectedClassId(null); setRelationDraft({ sourceClassId: connection.source, targetClassId: connection.target, type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' }) }
  const saveRelation = async (input: UmlRelationInput) => {
    if (!input.sourceClassId || !input.targetClassId) { setError('Selecciona las clases de origen y destino.'); return }
    const update = { type: input.type, sourceMultiplicity: input.sourceMultiplicity, targetMultiplicity: input.targetMultiplicity, label: input.label }
    if (await run(() => selectedRelation ? umlService.updateRelation(id, selectedRelation.id, update) : umlService.createRelation(id, input), selectedRelation ? 'Relación actualizada.' : 'Relación creada.')) { if (selectedRelation) await collaborationService.release('UML_RELATION', selectedRelation.id).catch(() => undefined); setSelectedRelationId(null) }
  }
  const returnTo = user?.role.name === 'COLABORADOR' ? '/shared-projects' : `/projects/${id}`
  const lockedByOther = (elementType: LockElementType, elementId: string) => locks.find(lock => lock.elementType === elementType && lock.elementId === elementId && lock.userId !== user?.id)
  const releaseSelection = async () => { if (selectedClassId) await collaborationService.release('UML_CLASS', selectedClassId).catch(() => undefined); if (selectedRelationId) await collaborationService.release('UML_RELATION', selectedRelationId).catch(() => undefined) }
  const selectElement = async (elementType: LockElementType, elementId: string) => {
    const blocked = lockedByOther(elementType, elementId); if (blocked) { setError(`Editando: ${blocked.userName}`); return false }
    await releaseSelection(); try { await collaborationService.acquire(elementType, elementId); setError(null); return true } catch (failure) { setError(messageFor(failure)); return false }
  }
  const openRelation = (relation: UmlRelation) => { if (selectedRelationId !== relation.id) setRelationDraft({ sourceClassId: relation.sourceClassId, targetClassId: relation.targetClassId, type: relation.type, sourceMultiplicity: relation.sourceMultiplicity, targetMultiplicity: relation.targetMultiplicity, label: relation.label ?? '' }); setSelectedRelationId(relation.id); setSelectedClassId(null) }

  if (loading) return <p role="status" className="p-6">Cargando editor UML…</p>
  if (!diagram) return <section className="p-6"><h1 className="text-xl font-bold">Editor no disponible</h1><p role="alert" className="mt-3 text-red-700">{error}</p></section>
  return <section className="flex h-[calc(100vh-81px)] min-h-[620px] flex-col bg-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><div><Link className="text-sm text-blue-700 underline" to={returnTo}>← Volver</Link><h1 className="text-xl font-bold">Editor UML · {diagram.name}</h1></div><div className="flex flex-wrap items-center gap-2" aria-label="Usuarios conectados">{presence.map(person => <span key={person.id} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{person.name} · {person.role}</span>)}<span className={`text-xs ${realtimeConnected ? 'text-emerald-700' : 'text-red-700'}`}>Realtime: {realtimeConnected ? (realtimeReady ? 'conectado' : 'sincronizando') : 'desconectado'}</span><span className="text-sm text-slate-600">{saving ? 'Guardando…' : 'Cambios persistidos'}</span><Link className="rounded border border-violet-700 px-4 py-2 text-violet-700" to={`/projects/${id}/ai-proposal`}>Generar con IA</Link><button disabled={saving || !realtimeReady} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void createClass()}>Nueva clase</button></div></header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={`mx-4 mt-2 rounded px-3 py-2 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{error ?? message}</div>}
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full border-r bg-white p-3 lg:w-64"><h2 className="font-semibold">Herramientas</h2><button className="mt-3 w-full rounded border px-3 py-2 text-sm" onClick={() => { void releaseSelection(); setSelectedClassId(null); setSelectedRelationId(null); setRelationDraft({ sourceClassId: '', targetClassId: '', type: 'ASSOCIATION', sourceMultiplicity: '1', targetMultiplicity: '1', label: '' }) }}>Nueva relación</button><p className="mt-3 text-xs text-slate-500">También puedes conectar los manejadores de dos clases.</p><h3 className="mt-5 text-sm font-semibold">Relaciones</h3><ul className="mt-2 space-y-1">{diagram.relations.map(relation => { const lock = lockedByOther('UML_RELATION', relation.id); return <li key={relation.id}><button disabled={Boolean(lock) || selectionPending} className="w-full rounded bg-slate-50 p-2 text-left text-xs disabled:bg-amber-50" onClick={() => { setSelectionPending(true); void selectElement('UML_RELATION', relation.id).then(ok => { if (ok) openRelation(relation) }).finally(() => setSelectionPending(false)) }}>{relation.label || relation.type}{lock ? ` · Editando: ${lock.userName}` : ''}</button></li> })}</ul></aside>
      <div className="relative min-h-[420px] flex-1"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView onNodeClick={(_, node) => { void selectElement('UML_CLASS', node.id).then(ok => { if (ok) { setSelectedClassId(node.id); setSelectedRelationId(null) } }) }} onEdgeClick={(_, edge) => { const relation = diagram.relations.find(item => item.id === edge.id); if (relation) void selectElement('UML_RELATION', edge.id).then(ok => { if (ok) openRelation(relation) }) }} onNodeDragStart={(_, node) => { void collaborationService.acquire('UML_CLASS', node.id).catch(failure => { setError(messageFor(failure)); void load() }) }} onNodeDragStop={(_, node) => { void (async () => { if (!await run(() => umlService.moveClass(id, node.id, flowNodeToMovePayload(node)), 'Posición guardada.')) await load(); await collaborationService.release('UML_CLASS', node.id).catch(() => undefined) })() }}><Background/><MiniMap/><Controls/></ReactFlow>{diagram.classes.length === 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><p className="rounded bg-white/90 p-4 text-slate-600 shadow">El diagrama está vacío. Crea tu primera clase.</p></div>}</div>
      {selectedClass && <UmlPropertiesPanel umlClass={selectedClass} disabled={saving}
        onUpdateClass={value => run(() => umlService.updateClass(id, selectedClass.id, value), 'Clase actualizada.')}
        onDeleteClass={async () => { if (await run(() => umlService.removeClass(id, selectedClass.id), 'Clase eliminada.')) { await collaborationService.release('UML_CLASS', selectedClass.id).catch(() => undefined); setSelectedClassId(null) } }}
        onCreateAttribute={value => run(() => umlService.createAttribute(id, selectedClass.id, value), 'Atributo agregado.')}
        onUpdateAttribute={(attributeId, value) => run(() => umlService.updateAttribute(id, selectedClass.id, attributeId, value), 'Atributo actualizado.')}
        onDeleteAttribute={attributeId => run(() => umlService.removeAttribute(id, selectedClass.id, attributeId), 'Atributo eliminado.')}
        onCreateMethod={value => run(() => umlService.createMethod(id, selectedClass.id, value), 'Método agregado.')}
        onUpdateMethod={(methodId, value) => run(() => umlService.updateMethod(id, selectedClass.id, methodId, value), 'Método actualizado.')}
        onDeleteMethod={methodId => run(() => umlService.removeMethod(id, selectedClass.id, methodId), 'Método eliminado.')}
        onClose={() => { void collaborationService.release('UML_CLASS', selectedClass.id); setSelectedClassId(null) }}/>}
      {!selectedClass && !selectionPending && <RelationPanel key={selectedRelation?.id ?? `${relationDraft.sourceClassId}:${relationDraft.targetClassId}`} classes={diagram.classes} relation={selectedRelation} draft={relationDraft} disabled={saving} onSave={saveRelation} onDelete={selectedRelation ? async () => { if (confirm('¿Eliminar esta relación?') && await run(() => umlService.removeRelation(id, selectedRelation.id), 'Relación eliminada.')) { await collaborationService.release('UML_RELATION', selectedRelation.id).catch(() => undefined); setSelectedRelationId(null) } } : undefined}/>}
    </div>
  </section>
}

function RelationPanel({ classes, relation, draft, disabled, onSave, onDelete }: { classes: UmlClass[]; relation: UmlRelation | null; draft: UmlRelationInput; disabled: boolean; onSave: (value: UmlRelationInput) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [value, setValue] = useState<UmlRelationInput>(draft)
  const update = <K extends keyof UmlRelationInput>(field: K, fieldValue: UmlRelationInput[K]) => setValue(current => ({ ...current, [field]: fieldValue }))
  return <aside className="w-full overflow-y-auto border-l bg-white p-4 lg:w-80" aria-label="Propiedades de relación"><h2 className="text-lg font-bold">{relation ? 'Editar relación' : 'Nueva relación'}</h2><form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void onSave(value) }}>
    <label className="block text-sm">Origen<select aria-label="Clase de origen" className="mt-1 w-full rounded border p-2" value={value.sourceClassId} onChange={event => update('sourceClassId', event.target.value)} disabled={Boolean(relation)}><option value="">Seleccionar</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm">Destino<select aria-label="Clase de destino" className="mt-1 w-full rounded border p-2" value={value.targetClassId} onChange={event => update('targetClassId', event.target.value)} disabled={Boolean(relation)}><option value="">Seleccionar</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm">Tipo<select aria-label="Tipo de relación" className="mt-1 w-full rounded border p-2" value={value.type} onChange={event => update('type', event.target.value as UmlRelationType)}>{relationTypes.map(option => <option key={option}>{option}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-sm">Multiplicidad origen<select aria-label="Multiplicidad de origen" className="mt-1 w-full rounded border p-2" value={value.sourceMultiplicity} onChange={event => update('sourceMultiplicity', event.target.value)}>{multiplicities.map(option => <option key={option}>{option}</option>)}</select></label><label className="text-sm">Multiplicidad destino<select aria-label="Multiplicidad de destino" className="mt-1 w-full rounded border p-2" value={value.targetMultiplicity} onChange={event => update('targetMultiplicity', event.target.value)}>{multiplicities.map(option => <option key={option}>{option}</option>)}</select></label></div>
    <label className="block text-sm">Etiqueta<input aria-label="Etiqueta de relación" className="mt-1 w-full rounded border p-2" maxLength={120} value={value.label ?? ''} onInput={event => update('label', event.currentTarget.value || undefined)}/></label>
    <button disabled={disabled || classes.length < 1} className="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50">{relation ? 'Guardar relación' : 'Crear relación'}</button>{onDelete && <button type="button" className="w-full rounded border border-red-600 px-3 py-2 text-red-700" onClick={() => void onDelete()}>Eliminar relación</button>}
  </form></aside>
}

function messageFor(failure: unknown) { return failure instanceof ApiError ? failure.message : 'No se pudo completar la operación. Intenta nuevamente.' }
