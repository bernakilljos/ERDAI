/**
 * 인메모리 세션 저장소 (서버 재시작 시 초기화)
 * token(UUID) → userId
 */
export const sessions = new Map<string, string>()

export const COOKIE_NAME = 'erdai_session'
export const COOKIE_MAX_AGE = 12 * 60 * 60 * 1000 // 12h

export function getTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return m ? m[1] : null
}
