import { downloadAuthenticated, requestMultipartJson } from '../../services/http'
import type { Diagram } from '../uml/types'

export interface XmiImportResult { imported: { classes: number; attributes: number; methods: number; relations: number }; diagram: Diagram }

export const xmiService = {
  export: (projectId: string) => downloadAuthenticated(`/projects/${projectId}/xmi/export`),
  import: (projectId: string, file: File) => { const body = new FormData(); body.append('file', file); return requestMultipartJson<XmiImportResult>(`/projects/${projectId}/xmi/import`, body) },
}
