import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AiProposalForm } from '../modules/ai/AiProposalForm'
import { aiService } from '../modules/ai/ai-service'
import type { AiUmlProposal } from '../modules/ai/types'
import { ApiError } from '../services/http'

export function AiProposalPage() {
  const { id = '' } = useParams(); const [proposal, setProposal] = useState<AiUmlProposal | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  const generate = async (prompt: string) => { setLoading(true); setError(null); try { const result = await aiService.generateUmlProposal(id, prompt); setProposal(result.proposal) } catch (failure) { setError(failure instanceof ApiError ? failure.message : 'No se pudo generar la propuesta.') } finally { setLoading(false) } }
  return <section><Link className="text-blue-700 underline" to={`/projects/${id}/editor`}>← Volver al editor UML</Link><h1 className="mt-4 text-2xl font-bold">Propuesta UML mediante IA</h1><p className="mt-2 text-slate-600">Describe el modelo que deseas explorar. En esta fase la propuesta se muestra para revisión y no modifica el diagrama.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}<div className="mt-5"><AiProposalForm loading={loading} proposal={proposal} onGenerate={generate}/></div></section>
}
