import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface FormState {
  loginId: string
  password: string
}

interface FormErrors {
  loginId?: string
  password?: string
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.loginId.trim()) errors.loginId = '아이디를 입력해주세요.'
  if (!form.password) errors.password = '비밀번호를 입력해주세요.'
  return errors
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()

  const [form, setForm] = useState<FormState>({ loginId: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
    setApiError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      const user = await login(form.loginId, form.password)
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/connections', { replace: true })
      }
    } catch (err) {
      setApiError((err as Error).message)
    }
  }

  return (
    <div className="login-wrapper">
      <form onSubmit={handleSubmit} className="login-card" noValidate>
        <h1 className="login-title">ERDAI</h1>
        <p className="login-subtitle">ERD AI 분석 도구</p>

        <div className="field">
          <label htmlFor="loginId">아이디</label>
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            value={form.loginId}
            onChange={handleChange}
            disabled={isLoading}
            aria-invalid={!!errors.loginId}
          />
          {errors.loginId && <span className="field-error">{errors.loginId}</span>}
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            disabled={isLoading}
            aria-invalid={!!errors.password}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        {apiError && (
          <div className="api-error" role="alert">
            {apiError}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="login-btn">
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
