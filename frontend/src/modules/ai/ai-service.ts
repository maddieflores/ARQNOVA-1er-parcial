import { requestJson } from '../../services/http'
import type { AiApplyResult, AiUmlProposal } from './types'

export const aiService = {
  generateUmlProposal: (projectId: string, prompt: string) => requestJson<{ proposal: AiUmlProposal }>(`/projects/${projectId}/ai/uml-proposal`, { method: 'POST', body: { prompt } }),
  applyUmlProposal: (projectId: string, proposal: AiUmlProposal) => requestJson<AiApplyResult>(`/projects/${projectId}/ai/apply-uml-proposal`, { method: 'POST', body: { proposal } }),
}
