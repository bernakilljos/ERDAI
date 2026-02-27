import type { TestStatus } from '../../hooks/useConnections'
import type { TestResult } from '../../types/connection'

interface Props {
  status: TestStatus
  result: TestResult | null
}

export default function TestResultBanner({ status, result }: Props) {
  if (status === 'idle') return null

  if (status === 'testing') {
    return (
      <div className="result-banner testing" role="status">
        <span className="banner-spinner" aria-hidden="true" />
        연결 테스트 중...
      </div>
    )
  }

  if (!result) return null

  return (
    <div className={`result-banner ${result.success ? 'ok' : 'fail'}`} role="alert">
      <span className="banner-icon">{result.success ? '성공' : '실패'}</span>
      {result.message}
      {result.dbVersion && (
        <span className="banner-meta"> / {result.dbVersion}</span>
      )}
    </div>
  )
}
