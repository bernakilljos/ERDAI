import type { Request, Response } from 'express'
import { ok, fail } from '../../lib/respond'
import { metadataExtractSchema } from './metadata.dto'
import { workerExtractMetadata, type WorkerTestPayload } from '../../lib/workerClient'
import { jsonStore } from '../../lib/jsonStore'

export async function handleExtractMetadata(req: Request, res: Response): Promise<void> {
  const parsed = metadataExtractSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  const connection = await jsonStore.findConnectionById(parsed.data.connectionId)
  if (!connection) {
    fail(res, 404, '연결 정보를 찾을 수 없습니다.')
    return
  }

  const payload: WorkerTestPayload = {
    db_type: connection.dbType,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    service_name: connection.serviceName,
    sid: connection.sid,
    username: connection.username,
    password: connection.password,
  }

  try {
    const metadata = await workerExtractMetadata(payload)
    const snapshot = await jsonStore.addSnapshot(connection.projectId, {
      projectId: connection.projectId,
      connectionId: connection.id,
      extractedAt: metadata.extracted_at,
      schemaName: metadata.schema_name,
      tableCount: metadata.table_count,
      columnCount: metadata.column_count,
      fkCount: metadata.fk_count,
      tables: metadata.tables,
    })
    if (!snapshot) {
      fail(res, 404, '프로젝트를 찾을 수 없습니다.')
      return
    }
    ok(res, snapshot)
  } catch (err) {
    fail(res, 500, (err as Error).message)
  }
}
