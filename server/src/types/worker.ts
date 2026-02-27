export interface WorkerColumnMeta {
  col_no: number
  name: string
  data_type: string
  nullable: boolean
  key_type: string
  is_pk: boolean
  default_value?: string
  extra?: string
  comment?: string
}

export interface WorkerFkMeta {
  column_name: string
  constraint_name: string
  ref_table: string
  ref_column: string
  update_rule?: string
  delete_rule?: string
}

export interface WorkerTableMeta {
  name: string
  comment?: string
  domain?: string
  columns: WorkerColumnMeta[]
  pk_columns: string[]
  fk_refs: WorkerFkMeta[]
}

export interface SchemaMetadata {
  schema_name: string
  table_count: number
  column_count: number
  fk_count: number
  tables: WorkerTableMeta[]
  extracted_at: string
}

export type ConfidenceLevel = 'FK' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M'

export interface WorkerInferredRelation {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  confidence: ConfidenceLevel
  cardinality: Cardinality
  reason?: string
  evidence?: string
  score?: number
}
