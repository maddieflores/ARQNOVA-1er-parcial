import { downloadAuthenticated, requestJson } from '../../services/http'

export interface GenerationResult { projectName: string; classCount: number; fileCount: number; files: string[] }

export const codeGeneratorService = {
  generate: (projectId: string) => requestJson<GenerationResult>(`/projects/${projectId}/code-generation/generate`, { method: 'POST' }),
  download: (projectId: string) => downloadAuthenticated(`/projects/${projectId}/code-generation/download`),
}
