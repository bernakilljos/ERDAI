export type ConfidenceLevel = 'FK' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ErdView = 'physical' | 'logical'
export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M'

export interface ErdColumn {
  name: string
  dataType: string
  nullable: boolean
  isPk: boolean
  isFk: boolean
  comment: string
}

export interface ErdTable {
  id: string
  name: string
  comment: string
  domain: string
  columns: ErdColumn[]
}

export interface ErdRelation {
  id: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  confidence: ConfidenceLevel
  cardinality: Cardinality
  reason?: string
  evidence?: string
}

export interface ErdGraph {
  projectId: string
  tables: ErdTable[]
  relations: ErdRelation[]
  extractedAt: string
}
