/**
 * 인증 라우터 (JSON 저장소)
 */
import { randomUUID } from 'crypto'
import { Router, type Request, type Response } from 'express'
import { fail } from '../../lib/respond'
import { jsonStore } from '../../lib/jsonStore'
import { sessions, COOKIE_NAME, COOKIE_MAX_AGE, getTokenFromCookie } from '../../lib/session'

// ── 타입 ───────────────────────────────────────────────────────────
interface SessionUser {
  id: string
  loginId: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  mustChangePassword: boolean
}

// ── 헬퍼 ──────────────────────────────────────────────────────────
function getToken(req: Request): string | null {
  return getTokenFromCookie(req.headers.cookie)
}

async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = getToken(req)
  if (!token) return null
  const userId = sessions.get(token)
  if (!userId) return null
  const user = await jsonStore.findUserById(userId)
  if (!user) return null
  return {
    id: user.id,
    loginId: user.loginId,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

// ── 라우터 ────────────────────────────────────────────────────────
const router = Router()

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { loginId, password } = req.body ?? {}
  if (!loginId || !password) {
    return fail(res, 400, '아이디와 비밀번호를 입력해주세요.')
  }

  const user = await jsonStore.findUserByLogin(loginId)
  if (!user || user.password !== password) {
    return fail(res, 401, '아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  const token = randomUUID()
  sessions.set(token, user.id)

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  })
  res.json({
    user: {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  })
})

// GET /auth/me
router.get('/me', async (req: Request, res: Response) => {
  const user = await getSessionUser(req)
  if (!user) return fail(res, 401, '로그인이 필요합니다.')
  res.json(user)
})

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = getToken(req)
  if (token) sessions.delete(token)
  res.clearCookie(COOKIE_NAME)
  res.status(204).end()
})

// POST /auth/change-password
router.post('/change-password', async (req: Request, res: Response) => {
  const user = await getSessionUser(req)
  if (!user) return fail(res, 401, '로그인이 필요합니다.')

  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    return fail(res, 400, '현재 비밀번호와 새 비밀번호를 입력해주세요.')
  }

  const existing = await jsonStore.findUserById(user.id)
  if (!existing || existing.password !== currentPassword) {
    return fail(res, 401, '현재 비밀번호가 올바르지 않습니다.')
  }
  if ((newPassword as string).length < 8) {
    return fail(res, 400, '새 비밀번호는 8자 이상이어야 합니다.')
  }

  existing.password = newPassword
  existing.mustChangePassword = false
  existing.updatedAt = new Date().toISOString()
  await jsonStore.saveUser(existing)

  res.status(204).end()
})

export default router
