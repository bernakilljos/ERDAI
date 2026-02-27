import { jsonStore, type UserRecord } from './jsonStore'

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'admin'

export async function bootstrap(): Promise<void> {
  await jsonStore.init()

  const existing = await jsonStore.findUserByLogin(ADMIN_LOGIN)
  if (!existing) {
    const now = new Date().toISOString()
    const admin: UserRecord = {
      id: `u-${Date.now().toString(36)}`,
      loginId: ADMIN_LOGIN,
      password: ADMIN_PASSWORD,
      role: 'ADMIN',
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    }
    await jsonStore.saveUser(admin)
  }

  const owner = await jsonStore.findUserByLogin(ADMIN_LOGIN)
  if (!owner) return

  const projects = await jsonStore.listProjects()
  if (projects.length === 0) {
    await jsonStore.createProject({
      projectName: '기본 프로젝트',
      description: '초기 샘플 프로젝트',
      ownerId: owner.id,
    })
  }
}
