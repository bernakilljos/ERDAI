import type { Request, Response } from 'express'
import { connectionTestSchema, connectionCreateSchema, connectionUpdateSchema } from './connections.dto'
import { testConnection } from './connections.service'
import { ok, fail } from '../../lib/respond'
import { jsonStore } from '../../lib/jsonStore'

/** POST /connections/test */
export async function handleTestConnection(req: Request, res: Response): Promise<void> {
  const parsed = connectionTestSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  try {
    const result = await testConnection(parsed.data)
    ok(res, result)
  } catch (err) {
    console.error('[connections/test] unhandled error:', (err as Error).message)
    fail(res, 500, '서버 오류가 발생했습니다.')
  }
}

/** POST /connections */
export async function handleCreateConnection(req: Request, res: Response): Promise<void> {
  const parsed = connectionCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  const data = parsed.data
  const projects = await jsonStore.listProjects()
  const projectId = data.projectId ?? projects[0]?.id
  if (!projectId) {
    fail(res, 400, '프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.')
    return
  }

  const connectionName = data.connectionName ?? `${data.dbType}-${data.host}`
  const created = await jsonStore.createConnection(projectId, {
    connectionName,
    dbType: data.dbType,
    host: data.host,
    port: data.port,
    database: data.database,
    serviceName: data.serviceName,
    sid: data.sid,
    username: data.username,
    password: data.password, // TODO: 운영에서는 암호화
  })

  if (!created) {
    fail(res, 404, '프로젝트를 찾을 수 없습니다.')
    return
  }

  ok(res, {
    id: created.id,
    projectId: created.projectId,
    connectionName: created.connectionName,
    dbType: created.dbType,
    host: created.host,
    port: created.port,
    database: created.database,
    serviceName: created.serviceName,
    sid: created.sid,
    username: created.username,
    createdAt: created.createdAt,
  })
}

/** PUT /connections/:id */
export async function handleUpdateConnection(req: Request, res: Response): Promise<void> {
  const parsed = connectionUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }
  const updated = await jsonStore.updateConnection(req.params.id, parsed.data)
  if (!updated) {
    fail(res, 404, '연결을 찾을 수 없습니다.')
    return
  }
  ok(res, {
    id: updated.id,
    projectId: updated.projectId,
    connectionName: updated.connectionName,
    dbType: updated.dbType,
    host: updated.host,
    port: updated.port,
    database: updated.database,
    serviceName: updated.serviceName,
    sid: updated.sid,
    username: updated.username,
    createdAt: updated.createdAt,
  })
}

/** DELETE /connections/:id */
export async function handleDeleteConnection(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const deleted = await jsonStore.deleteConnection(id)
  if (!deleted) {
    fail(res, 404, '연결을 찾을 수 없습니다.')
    return
  }
  res.status(204).end()
}

/** GET /connections */
export async function handleListConnections(_req: Request, res: Response): Promise<void> {
  const list = await jsonStore.listConnections()
  ok(res, list.map(c => ({
    id: c.id,
    projectId: c.projectId,
    connectionName: c.connectionName,
    dbType: c.dbType,
    host: c.host,
    port: c.port,
    database: c.database,
    serviceName: c.serviceName,
    sid: c.sid,
    username: c.username,
    createdAt: c.createdAt,
  })))
}
