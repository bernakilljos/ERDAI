import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ConnectionsPage from './pages/ConnectionsPage'

const ErdStudioPage = lazy(() => import('./pages/ErdStudioPage'))

/** 로그인이 필요한 페이지 — 미로그인 시 /login으로 리다이렉트 */
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div style={{ padding: 32 }}>로딩 중...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/connections"     element={<PrivateRoute><ConnectionsPage /></PrivateRoute>} />
      <Route
        path="/erd/:projectId"
        element={
          <PrivateRoute>
            <Suspense fallback={<div style={{ padding: 32 }}>ERD 로딩 중...</div>}>
              <ErdStudioPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
