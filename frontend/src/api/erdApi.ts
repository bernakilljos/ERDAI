import type { ErdGraph } from '../types/erd'
import { request } from '../lib/fetchClient'

export const erdApi = {
  get: (projectId: string) => request<ErdGraph>(`/erd/${projectId}`),
  sync: (projectId: string, connectionId?: string) =>
    request<ErdGraph>(`/erd/${projectId}/sync`, {
      method: 'POST',
      body: JSON.stringify(connectionId ? { connectionId } : {}),
    }),
  exportDbml: (projectId: string) =>
    fetch(`/erd/${projectId}/export/dbml`, { credentials: 'include' })
      .then(res => res.text()),
  exportMermaid: (projectId: string) =>
    fetch(`/erd/${projectId}/export/mermaid`, { credentials: 'include' })
      .then(res => res.text()),
}
