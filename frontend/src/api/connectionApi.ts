import type { ConnectionFormValues } from '../lib/connectionSchema'
import type { SavedConnection, TestResult } from '../types/connection'
import { request } from '../lib/fetchClient'

export const connectionApi = {
  /** 연결 테스트(저장하지 않음) */
  test: (data: ConnectionFormValues) =>
    request<TestResult>('/connections/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** 연결 정보 저장 */
  save: (data: ConnectionFormValues, projectId?: string) =>
    request<SavedConnection>('/connections', {
      method: 'POST',
      body: JSON.stringify({ ...data, ...(projectId ? { projectId } : {}) }),
    }),

  list: () =>
    request<SavedConnection[]>('/connections'),

  update: (id: string, body: { connectionName: string }) =>
    request<SavedConnection>(`/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<void>(`/connections/${id}`, { method: 'DELETE' }),
}
