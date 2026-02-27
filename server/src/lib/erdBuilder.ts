import type { ErdGraph, ErdRelation, ErdTable } from '../types/erd'
import type { WorkerBuildErdResult, WorkerRelation } from './workerClient'

const toRelationId = (rel: WorkerRelation, idx: number) =>
  `${rel.source_table}.${rel.source_column}->${rel.target_table}.${rel.target_column}:${idx}`

export function buildErdGraph(
  projectId: string,
  build: WorkerBuildErdResult,
): ErdGraph {
  const tables: ErdTable[] = build.tables.map(t => ({
    id: t.name,
    name: t.name,
    comment: t.comment ?? '',
    domain: t.domain ?? 'ETC',
    columns: t.columns.map(c => ({
      name: c.name,
      dataType: c.data_type,
      nullable: c.nullable,
      isPk: c.is_pk,
      isFk: c.is_fk,
      comment: c.comment ?? '',
    })),
  }))

  const relations: ErdRelation[] = build.relations.map((r, idx) => ({
    id: toRelationId(r, idx),
    sourceTable: r.source_table,
    sourceColumn: r.source_column,
    targetTable: r.target_table,
    targetColumn: r.target_column,
    confidence: r.confidence,
    cardinality: r.cardinality,
    reason: r.reason,
    evidence: r.evidence,
  }))

  return {
    projectId,
    tables,
    relations,
    extractedAt: build.extracted_at,
  }
}
