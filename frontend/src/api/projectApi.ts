import type { Project } from '../types/project'
import { request } from '../lib/fetchClient'

export const projectApi = {
  list: () => request<Project[]>('/projects'),
  get: (projectId: string) => request<Project>(`/projects/${projectId}`),
  create: (data: { projectName: string; description?: string }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reset: (projectId: string) => request<{ message: string }>(`/projects/${projectId}/reset`, {
    method: 'POST',
  }),
}
