import type { Request, Response } from 'express'
import type { ErdRelation, ErdGraph } from '../../types/erd'
import { ok, fail } from '../../lib/respond'
import { erdSyncSchema } from './erd.dto'
import { extractMetadata } from '../../lib/dbMetadata'
import { inferRelations } from '../../lib/relationInferrer'
import { buildDbml, buildMermaid } from '../../lib/dbExporter'
import { buildErdGraph } from '../../lib/erdBuilder'
import { jsonStore } from '../../lib/jsonStore'
import type { WorkerRelation, WorkerExtractResult, WorkerBuildErdResult } from '../../lib/workerClient'

/** WorkerExtractResult + WorkerRelation[] → WorkerBuildErdResult */
function toBuildResult(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): WorkerBuildErdResult {
  const fkSets = new Map<string, Set<string>>()
  for (const t of metadata.tables) {
    fkSets.set(t.name, new Set(t.fk_refs.map(f => f.column_name)))
  }
  for (const rel of relations) {
    if (!fkSets.has(rel.source_table)) fkSets.set(rel.source_table, new Set())
    fkSets.get(rel.source_table)!.add(rel.source_column)
  }

  return {
    tables: metadata.tables.map(t => ({
      name: t.name,
      comment: t.comment,
      domain: t.domain,
      columns: t.columns.map(c => ({
        name: c.name,
        data_type: c.data_type,
        nullable: c.nullable,
        is_pk: c.is_pk,
        is_fk: (fkSets.get(t.name) ?? new Set<string>()).has(c.name),
        comment: c.comment,
      })),
    })),
    relations,
    extracted_at: metadata.extracted_at,
  }
}

function toWorkerRelation(relations: ErdRelation[]): WorkerRelation[] {
  if (!relations) return []
  return relations.map(r => ({
    source_table: r.sourceTable,
    source_column: r.sourceColumn,
    target_table: r.targetTable,
    target_column: r.targetColumn,
    confidence: r.confidence,
    cardinality: r.cardinality,
    reason: r.reason,
    evidence: r.evidence,
  }))
}

export async function handleGetErd(req: Request, res: Response): Promise<void> {
  const graphRow = await jsonStore.getLatestGraph(req.params.projectId)
  if (!graphRow) {
    fail(res, 404, 'ERD 그래프가 없습니다. 동기화를 먼저 수행해주세요.')
    return
  }
  ok(res, graphRow.graph)
}

/** POST /erd/:projectId/sync — SSE 스트림 */
export async function handleSyncErd(req: Request, res: Response): Promise<void> {
  const parsed = erdSyncSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  const projectId = req.params.projectId
  const connectionId = parsed.data.connectionId

  const connection = connectionId
    ? await jsonStore.findConnectionById(connectionId)
    : (await jsonStore.listConnections()).find(c => c.projectId === projectId)

  if (!connection) {
    fail(res, 404, '연결 정보를 찾을 수 없습니다.')
    return
  }

  console.log(`[erd/sync] projectId=${projectId} conn: ${connection.dbType} ${connection.host}:${connection.port} db=${connection.database ?? ''} user=${connection.username}`)

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  // Nagle 알고리즘 비활성화 → 각 이벤트를 즉시 전송
  res.socket?.setNoDelay(true)
  res.flushHeaders()

  const send = (data: object) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  let aborted = false
  req.on('close', () => { aborted = true })

  try {
    send({ step: 'connect', message: 'DB 연결 중...', progress: 15 })
    if (aborted) return

    const metadata = await extractMetadata({
      dbType:      connection.dbType,
      host:        connection.host,
      port:        connection.port,
      database:    connection.database,
      serviceName: connection.serviceName,
      sid:         connection.sid,
      username:    connection.username,
      password:    connection.password,
    })
    if (aborted) return

    send({ step: 'extract', message: `테이블 메타데이터 추출 중... (${metadata.table_count}개 테이블)`, progress: 45 })

    const relations = inferRelations(metadata)
    if (aborted) return

    send({ step: 'infer', message: `관계 추론 중... (${relations.length}개 관계 발견)`, progress: 70 })

    const buildResult = toBuildResult(metadata, relations)
    const graph: ErdGraph = buildErdGraph(projectId, buildResult)
    if (aborted) return

    send({ step: 'save', message: 'ERD 저장 중...', progress: 88 })

    await jsonStore.resetProjectData(projectId)
    await jsonStore.addSnapshot(projectId, {
      projectId: connection.projectId,
      connectionId: connection.id,
      extractedAt: metadata.extracted_at,
      schemaName: metadata.schema_name,
      tableCount: metadata.table_count,
      columnCount: metadata.column_count,
      fkCount: metadata.fk_count,
      tables: metadata.tables,
    })
    await jsonStore.addGraph(projectId, {
      projectId,
      extractedAt: graph.extractedAt,
      graph,
    })

    send({ step: 'done', message: '동기화 완료', progress: 100, graph })
  } catch (err) {
    const msg = (err as Error).message
    console.error('[erd/sync] error:', msg)
    send({ step: 'error', message: msg, progress: 0 })
  } finally {
    if (!res.writableEnded) res.end()
  }
}

export async function handleExportDbml(req: Request, res: Response): Promise<void> {
  const projectId = req.params.projectId
  const graphRow = await jsonStore.getLatestGraph(projectId)
  const snapshot = await jsonStore.getLatestSnapshot(projectId)
  if (!graphRow || !snapshot) {
    fail(res, 404, 'ERD 데이터가 없습니다.')
    return
  }

  try {
    const dbml = buildDbml(
      {
        schema_name: snapshot.schemaName,
        table_count: snapshot.tableCount,
        column_count: snapshot.columnCount,
        fk_count: snapshot.fkCount,
        tables: snapshot.tables as WorkerExtractResult['tables'],
        extracted_at: snapshot.extractedAt,
      },
      toWorkerRelation(graphRow.graph.relations),
    )
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(dbml)
  } catch (err) {
    fail(res, 500, (err as Error).message)
  }
}

export async function handleExportMermaid(req: Request, res: Response): Promise<void> {
  const projectId = req.params.projectId
  const graphRow = await jsonStore.getLatestGraph(projectId)
  const snapshot = await jsonStore.getLatestSnapshot(projectId)
  if (!graphRow || !snapshot) {
    fail(res, 404, 'ERD 데이터가 없습니다.')
    return
  }

  try {
    const mermaid = buildMermaid(
      {
        schema_name: snapshot.schemaName,
        table_count: snapshot.tableCount,
        column_count: snapshot.columnCount,
        fk_count: snapshot.fkCount,
        tables: snapshot.tables as WorkerExtractResult['tables'],
        extracted_at: snapshot.extractedAt,
      },
      toWorkerRelation(graphRow.graph.relations),
    )
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(mermaid)
  } catch (err) {
    fail(res, 500, (err as Error).message)
  }
}
