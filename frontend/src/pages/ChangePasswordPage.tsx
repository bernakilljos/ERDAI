import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'

interface FormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type FormField = keyof FormState
type FormErrors = Partial<Record<FormField, string>>

const FIELD_LABELS: Record<FormField, string> = {
  currentPassword: '현재 비밀번호',
  newPassword: '새 비밀번호',
  confirmPassword: '새 비밀번호 확인',
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.currentPassword) errors.currentPassword = '현재 비밀번호를 입력해주세요.'
  if (form.newPassword.length < 8) errors.newPassword = '새 비밀번호는 8자 이상이어야 합니다.'
  if (form.newPassword && form.newPassword === form.currentPassword)
    errors.newPassword = '현재 비밀번호와 다르게 설정해주세요.'
  if (form.newPassword !== form.confirmPassword)
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
  return errors
}

const FIELDS: FormField[] = ['currentPassword', 'newPassword', 'confirmPassword']

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()

  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
    setIsLoading(true)
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      // 변경 성공: mustChangePassword 플래그 해제 후 이동
      if (user) setUser({ ...user, mustChangePassword: false })
      navigate('/connections', { replace: true })
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <form onSubmit={handleSubmit} className="login-card" noValidate>
        <h1 className="login-title">비밀번호 변경</h1>
        <p className="login-subtitle">초기 비밀번호를 새 비밀번호로 변경해주세요.</p>

        {FIELDS.map(field => (
          <div className="field" key={field}>
            <label htmlFor={field}>{FIELD_LABELS[field]}</label>
            <input
              id={field}
              name={field}
              type="password"
              autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
              value={form[field]}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors[field]}
            />
            {errors[field] && <span className="field-error">{errors[field]}</span>}
          </div>
        ))}

        {apiError && (
          <div className="api-error" role="alert">
            {apiError}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="login-btn">
          {isLoading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}
