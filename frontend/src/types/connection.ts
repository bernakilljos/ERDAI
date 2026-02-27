export type DbType = 'mysql' | 'mssql' | 'oracle'

/** 저장된 연결 정보 (API 응답) */
export interface SavedConnection {
  id: string
  projectId?: string
  connectionName?: string
  dbType: DbType
  host: string
  port: number
  database?: string
  serviceName?: string
  sid?: string
  username: string
  createdAt: string
}

/** 연결 테스트 결과 */
export interface TestResult {
  success: boolean
  message: string
  dbVersion?: string
}
