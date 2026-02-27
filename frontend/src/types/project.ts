export type DbType = 'mysql' | 'mssql' | 'oracle'

export interface Project {
  id: string
  projectName: string
  description: string
}

export interface ProjectConnection {
  id: string
  projectId: string
  connectionName: string
  dbType: DbType
  host: string
  port: number
  database?: string
  serviceName?: string
  sid?: string
}
