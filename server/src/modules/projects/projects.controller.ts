import type { Request, Response } from 'express'
import { ok, fail } from '../../lib/respond'
import { projectCreateSchema, projectUpdateSchema } from './projects.dto'
import { jsonStore } from '../../lib/jsonStore'

async function getDefaultOwnerId(): Promise<string | null> {
  const admin = await jsonStore.findUserByLogin('admin')
  return admin?.id ?? null
}

export async function handleListProjects(_req: Request, res: Response): Promise<void> {
  const list = await jsonStore.listProjects()
  ok(res, list)
}

export async function handleCreateProject(req: Request, res: Response): Promise<void> {
  const parsed = projectCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  const ownerId = await getDefaultOwnerId()
  if (!ownerId) {
    fail(res, 500, '소유자 계정을 찾을 수 없습니다.')
    return
  }

  const project = await jsonStore.createProject({
    projectName: parsed.data.projectName,
    description: parsed.data.description ?? '',
    ownerId,
  })
  ok(res, project)
}

export async function handleGetProject(req: Request, res: Response): Promise<void> {
  const project = await jsonStore.getProject(req.params.projectId)
  if (!project) {
    fail(res, 404, '프로젝트를 찾을 수 없습니다.')
    return
  }
  ok(res, project)
}

export async function handleUpdateProject(req: Request, res: Response): Promise<void> {
  const existing = await jsonStore.getProject(req.params.projectId)
  if (!existing) {
    fail(res, 404, '프로젝트를 찾을 수 없습니다.')
    return
  }

  const parsed = projectUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    const details = parsed.error.errors.map(e => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    fail(res, 400, '입력값을 확인해주세요.', { details })
    return
  }

  const updated = await jsonStore.updateProject(req.params.projectId, {
    projectName: parsed.data.projectName,
    description: parsed.data.description,
  })

  if (!updated) {
    fail(res, 404, '프로젝트를 찾을 수 없습니다.')
    return
  }

  ok(res, updated)
}

/** POST /projects/:projectId/reset */
export async function handleResetProject(req: Request, res: Response): Promise<void> {
  const project = await jsonStore.getProject(req.params.projectId)
  if (!project) {
    fail(res, 404, '프로젝트를 찾을 수 없습니다.')
    return
  }

  const okReset = await jsonStore.resetProjectData(req.params.projectId)
  if (!okReset) {
    fail(res, 500, '프로젝트 초기화에 실패했습니다.')
    return
  }

  ok(res, { message: '프로젝트 데이터가 초기화되었습니다.' })
}
