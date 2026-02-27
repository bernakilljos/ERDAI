import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User } from '../types/auth'
import { authApi } from '../api/authApi'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (loginId: string, password: string) => Promise<User>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // 초기에는 세션 확인 중

  // 페이지 로드/새로고침 시 쿠키로 세션 복구
  useEffect(() => {
    authApi.me()
      .then(u => setUser(u))
      .catch(() => {
        // setUser(null) 호출 금지:
        // login() 이후에 /auth/me가 뒤늦게 실패해서 user를 덮어쓰는 race condition 방지
        // user 초기값이 이미 null이므로 아무것도 안 해도 됨
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (loginId: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      const res = await authApi.login({ loginId, password })
      setUser(res.user)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>')
  return ctx
}
