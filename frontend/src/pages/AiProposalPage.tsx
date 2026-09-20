import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AiProposalForm } from '../modules/ai/AiProposalForm'
import { aiService } from '../modules/ai/ai-service'
import type { AiUmlProposal } from '../modules/ai/types'
import { ApiError } from '../services/http'

export function AiProposalPage() {
  const { id = '' } = useParams(); const [proposal, setProposal] = useState<AiUmlProposal | null>(null); const [loading, setLoading] = useState(false); const [applying, setApplying] = useState(false); const [applied, setApplied] = useState(false); const [error, setError] = useState<string | null>(null)
  const generate = async (prompt: string) => { setLoading(true); setError(null); setApplied(false); try { const result = await aiService.generateUmlProposal(id, prompt); setProposal(result.proposal) } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo generar la propuesta.') } finally { setLoading(false) } }
  const apply = async () => { if (!proposal) return; setApplying(true); setError(null); try { await aiService.applyUmlProposal(id, proposal); setApplied(true) } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo aplicar la propuesta.') } finally { setApplying(false) } }
  const cancel = () => { setProposal(null); setApplied(false); setError(null) }
  return <section><Link className="text-blue-700 underline" to={`/projects/${id}/editor`}>← Volver al editor UML</Link><h1 className="mt-4 text-2xl font-bold">Propuesta UML mediante IA</h1><p className="mt-2 text-slate-600">Describe el modelo, revisa la propuesta y confirma antes de agregarla al diagrama.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}{applied && <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded bg-green-50 p-3 text-green-800"><span>Propuesta aplicada y persistida correctamente.</span><Link className="rounded bg-green-700 px-4 py-2 text-white" to={`/projects/${id}/editor`}>Ver en editor UML</Link></div>}<div className="mt-5"><AiProposalForm loading={loading} applying={applying} applied={applied} proposal={proposal} onGenerate={generate} onApply={apply} onCancel={cancel}/></div></section>
}
