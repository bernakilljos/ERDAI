import { useState, forwardRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * 비밀번호 입력 + 마스킹 토글
 * forwardRef로 react-hook-form register()의 ref를 그대로 전달
 */
const PasswordField = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        autoComplete="current-password"
        className={`conn-input${props['aria-invalid'] ? ' error' : ''}`}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        tabIndex={-1}
      >
        {visible ? '숨기기' : '보기'}
      </button>
    </div>
  )
})

PasswordField.displayName = 'PasswordField'
export default PasswordField
