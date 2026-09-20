import { useState, type FormEvent } from 'react'
import type { AiUmlProposal } from './types'

export function AiProposalForm({ loading, proposal, onGenerate }: { loading: boolean; proposal: AiUmlProposal | null; onGenerate: (prompt: string) => Promise<void> }) {
  const [prompt, setPrompt] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); const value = prompt.trim(); if (value) void onGenerate(value) }
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <form className="rounded border bg-white p-5" onSubmit={submit}>
      <label className="block font-semibold" htmlFor="ai-prompt">Describir modelo UML</label>
      <textarea id="ai-prompt" className="mt-2 min-h-48 w-full rounded border p-3" maxLength={2000} required value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Crea una clase Cliente con id y nombre…"/>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>La propuesta se validará antes de mostrarse.</span><span>{prompt.length}/2000</span></div>
      <button className="mt-4 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={loading || !prompt.trim()}>{loading ? 'Generando…' : 'Generar propuesta'}</button>
    </form>
    <section className="rounded border bg-white p-5" aria-label="Propuesta UML">
      <h2 className="text-lg font-bold">Propuesta validada</h2>
      {!proposal ? <p className="mt-3 text-slate-600">Aún no existe una propuesta. El diagrama actual no será modificado.</p> : <div className="mt-4 space-y-5">
        <div><h3 className="font-semibold">Clases</h3><ul className="mt-2 space-y-3">{proposal.classes.map(umlClass => <li key={umlClass.name} className="rounded bg-slate-50 p-3"><strong>{umlClass.name}</strong><ul className="mt-2 text-sm">{umlClass.attributes.map(attribute => <li key={attribute.name}>{attribute.visibility} {attribute.name}: {attribute.type}{attribute.isPrimaryKey ? ' (PK)' : ''}</li>)}{umlClass.methods.map(method => <li key={method.name}>{method.visibility} {method.name}(): {method.returnType}</li>)}</ul></li>)}</ul></div>
        <div><h3 className="font-semibold">Relaciones</h3>{proposal.relations.length === 0 ? <p className="mt-2 text-sm text-slate-600">Sin relaciones propuestas.</p> : <ul className="mt-2 space-y-2 text-sm">{proposal.relations.map((relation, index) => <li key={`${relation.sourceClassName}-${relation.targetClassName}-${index}`} className="rounded bg-slate-50 p-3">{relation.sourceClassName} [{relation.sourceMultiplicity ?? ''}] → {relation.targetClassName} [{relation.targetMultiplicity ?? ''}] · {relation.type}{relation.label ? ` · ${relation.label}` : ''}</li>)}</ul>}</div>
      </div>}
    </section>
  </div>
}
