import { useEffect, useState, type FormEvent } from 'react'
import type { UmlAttribute, UmlClass, UmlMethod, UmlVisibility } from './types'
import type { UmlAttributeInput, UmlMethodInput } from './uml-service'

const visibilities: UmlVisibility[] = ['PUBLIC', 'PRIVATE', 'PROTECTED', 'PACKAGE']

interface Props {
  umlClass: UmlClass
  disabled: boolean
  onUpdateClass: (value: { name: string; isAbstract: boolean }) => Promise<unknown>
  onDeleteClass: () => Promise<unknown>
  onCreateAttribute: (value: UmlAttributeInput) => Promise<unknown>
  onUpdateAttribute: (id: string, value: UmlAttributeInput) => Promise<unknown>
  onDeleteAttribute: (id: string) => Promise<unknown>
  onCreateMethod: (value: UmlMethodInput) => Promise<unknown>
  onUpdateMethod: (id: string, value: UmlMethodInput) => Promise<unknown>
  onDeleteMethod: (id: string) => Promise<unknown>
}

export function UmlPropertiesPanel(props: Props) {
  const [name, setName] = useState(props.umlClass.name); const [isAbstract, setAbstract] = useState(props.umlClass.isAbstract)
  useEffect(() => { setName(props.umlClass.name); setAbstract(props.umlClass.isAbstract) }, [props.umlClass])
  return <aside className="w-full overflow-y-auto border-l bg-white p-4 lg:w-80" aria-label="Propiedades de clase">
    <h2 className="text-lg font-bold">Clase UML</h2>
    <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void props.onUpdateClass({ name, isAbstract }) }}>
      <label className="block text-sm font-medium">Nombre<input aria-label="Nombre de clase" className="mt-1 w-full rounded border p-2" required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={isAbstract} onChange={event => setAbstract(event.target.checked)}/>Clase abstracta</label>
      <button disabled={props.disabled} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">Guardar clase</button>
    </form>
    <MemberEditor kind="attribute" items={props.umlClass.attributes} disabled={props.disabled} onCreate={props.onCreateAttribute} onUpdate={props.onUpdateAttribute} onDelete={props.onDeleteAttribute}/>
    <MemberEditor kind="method" items={props.umlClass.methods} disabled={props.disabled} onCreate={props.onCreateMethod} onUpdate={props.onUpdateMethod} onDelete={props.onDeleteMethod}/>
    <button type="button" disabled={props.disabled} className="mt-6 w-full rounded border border-red-600 px-3 py-2 text-sm text-red-700" onClick={() => { if (confirm(`¿Eliminar la clase ${props.umlClass.name}?`)) void props.onDeleteClass() }}>Eliminar clase</button>
  </aside>
}

type MemberProps = {
  kind: 'attribute'; items: UmlAttribute[]; disabled: boolean; onCreate: (value: UmlAttributeInput) => Promise<unknown>; onUpdate: (id: string, value: UmlAttributeInput) => Promise<unknown>; onDelete: (id: string) => Promise<unknown>
} | {
  kind: 'method'; items: UmlMethod[]; disabled: boolean; onCreate: (value: UmlMethodInput) => Promise<unknown>; onUpdate: (id: string, value: UmlMethodInput) => Promise<unknown>; onDelete: (id: string) => Promise<unknown>
}

function MemberEditor(props: MemberProps) {
  const [editing, setEditing] = useState<string | null>(null); const [name, setName] = useState(''); const [type, setType] = useState('String'); const [visibility, setVisibility] = useState<UmlVisibility>(props.kind === 'attribute' ? 'PRIVATE' : 'PUBLIC'); const [primary, setPrimary] = useState(false)
  const reset = () => { setEditing(null); setName(''); setType(props.kind === 'attribute' ? 'String' : 'void'); setVisibility(props.kind === 'attribute' ? 'PRIVATE' : 'PUBLIC'); setPrimary(false) }
  const edit = (item: UmlAttribute | UmlMethod) => { setEditing(item.id); setName(item.name); setType('type' in item ? item.type : item.returnType); setVisibility(item.visibility); setPrimary('isPrimaryKey' in item && item.isPrimaryKey) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    let result: unknown
    if (props.kind === 'attribute') { const value = { name, type, visibility, isPrimaryKey: primary }; result = editing ? await props.onUpdate(editing, value) : await props.onCreate(value) }
    else { const value = { name, returnType: type, visibility }; result = editing ? await props.onUpdate(editing, value) : await props.onCreate(value) }
    if (result !== false) reset()
  }
  const title = props.kind === 'attribute' ? 'Atributos' : 'Métodos'
  return <section className="mt-6 border-t pt-4"><h3 className="font-semibold">{title}</h3>
    <ul className="mt-2 space-y-2">{props.items.map(item => <li key={item.id} className="rounded bg-slate-50 p-2 text-xs"><span>{item.name}: {'type' in item ? item.type : item.returnType}</span><div className="mt-1 flex gap-2"><button type="button" className="text-blue-700 underline" onClick={() => edit(item)}>Editar</button><button type="button" className="text-red-700 underline" onClick={() => { if (confirm(`¿Eliminar ${item.name}?`)) void props.onDelete(item.id) }}>Eliminar</button></div></li>)}</ul>
    <form className="mt-3 space-y-2" onSubmit={event => void submit(event)}>
      <input aria-label={`Nombre de ${props.kind === 'attribute' ? 'atributo' : 'método'}`} className="w-full rounded border p-2 text-sm" required placeholder="Nombre" value={name} onChange={event => setName(event.target.value)}/>
      <input aria-label={props.kind === 'attribute' ? 'Tipo de atributo' : 'Tipo de retorno'} className="w-full rounded border p-2 text-sm" required placeholder={props.kind === 'attribute' ? 'Tipo' : 'Retorno'} value={type} onChange={event => setType(event.target.value)}/>
      <select aria-label="Visibilidad" className="w-full rounded border p-2 text-sm" value={visibility} onChange={event => setVisibility(event.target.value as UmlVisibility)}>{visibilities.map(value => <option key={value}>{value}</option>)}</select>
      {props.kind === 'attribute' && <label className="flex gap-2 text-xs"><input type="checkbox" checked={primary} onChange={event => setPrimary(event.target.checked)}/>Clave primaria</label>}
      <div className="flex gap-2"><button disabled={props.disabled} className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white">{editing ? 'Actualizar' : 'Agregar'} {props.kind === 'attribute' ? 'atributo' : 'método'}</button>{editing && <button type="button" className="text-xs underline" onClick={reset}>Cancelar</button>}</div>
    </form>
  </section>
}
