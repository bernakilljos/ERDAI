import { type Request, type Response, type NextFunction } from 'express'
import { fail } from './respond'
import { jsonStore } from './jsonStore'
import { sessions, getTokenFromCookie } from './session'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromCookie(req.headers.cookie)
  if (!token) return fail(res, 401, '로그인이 필요합니다.')

  const userId = sessions.get(token)
  if (!userId) return fail(res, 401, '세션이 만료되었습니다. 다시 로그인해주세요.')

  const user = await jsonStore.findUserById(userId)
  if (!user) return fail(res, 401, '사용자를 찾을 수 없습니다.')

  // req에 user 정보 주입 (타입 확장)
  ;(req as any).sessionUser = {
    id: user.id,
    loginId: user.loginId,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }

  next()
}
