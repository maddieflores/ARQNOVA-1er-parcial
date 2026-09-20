import { requestJson } from '../../services/http'
import type { AiUmlProposal } from './types'

export const aiService = {
  generateUmlProposal: (projectId: string, prompt: string) => requestJson<{ proposal: AiUmlProposal }>(`/projects/${projectId}/ai/uml-proposal`, { method: 'POST', body: { prompt } }),
}
