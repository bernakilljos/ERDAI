/**
 * 공통 fetch 유틸
 * - Vite 프록시를 경유하므로 BASE URL 없이 상대 경로 사용
 *   (vite.config.ts proxy: /auth, /connections, /projects, /metadata, /erd → localhost:4000)
 * - credentials: 'include' (쿠키 자동 포함)
 * - 401 응답 시 /login으로 리다이렉트
 */

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })

  if (res.status === 401) {
    // 세션 만료 → 로그인 페이지로 강제 이동 (/auth/me 요청 제외)
    if (!path.startsWith('/auth/')) {
      window.location.href = '/login'
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? '로그인이 필요합니다.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `요청 실패 (${res.status})`)
  }

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
