import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  connectionSchema,
  DEFAULT_PORTS,
  type ConnectionFormValues,
} from '../../lib/connectionSchema'
import type { DbType } from '../../types/connection'
import type { Project } from '../../types/project'
import { useConnections } from '../../hooks/useConnections'
import DbTypeSelector from './DbTypeSelector'
import DbFields from './DbFields'
import PasswordField from './PasswordField'
import TestResultBanner from './TestResultBanner'

interface Props {
  onSaveSuccess?: () => void
  projects?: Project[]
  selectedProjectId?: string
  onProjectChange?: (id: string) => void
}

export default function ConnectionForm({ onSaveSuccess, projects, selectedProjectId, onProjectChange }: Props) {
  const {
    testStatus, testResult,
    isSaving, saveError, saveSuccess,
    testConnection, saveConnection,
  } = useConnections(onSaveSuccess, selectedProjectId)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      dbType:      'mysql',
      host:        '',
      port:        DEFAULT_PORTS.mysql,
      database:    '',
      serviceName: '',
      sid:         '',
      username:    '',
      password:    '',
    },
  })

  const dbType = watch('dbType')

  // DB 종류 변경 시 기본 포트를 자동 갱신
  useEffect(() => {
    setValue('port', DEFAULT_PORTS[dbType], { shouldValidate: false })
  }, [dbType, setValue])

  return (
    <div className="conn-card">
      <h2 className="conn-card-title">DB 연결 설정</h2>

      {/* 프로젝트 선택 */}
      {projects && projects.length > 0 && (
        <div className="field">
          <label htmlFor="projectId">프로젝트</label>
          <select
            id="projectId"
            className="conn-input"
            value={selectedProjectId ?? ''}
            onChange={e => onProjectChange?.(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>
        </div>
      )}

      {/* DB 종류 선택 */}
      <div className="field">
        <label>DB 종류</label>
        <DbTypeSelector
          value={dbType as DbType}
          onChange={type => setValue('dbType', type, { shouldDirty: true })}
        />
      </div>

      {/* Host / Port */}
      <div className="field-row">
        <div className="field field-grow">
          <label htmlFor="host">
            호스트 <span className="required">*</span>
          </label>
          <input
            id="host"
            {...register('host')}
            className={`conn-input${errors.host ? ' error' : ''}`}
            placeholder="127.0.0.1"
          />
          {errors.host && <span className="field-error">{errors.host.message}</span>}
        </div>

        <div className="field field-port">
          <label htmlFor="port">
            포트 <span className="required">*</span>
          </label>
          <input
            id="port"
            {...register('port')}
            className={`conn-input${errors.port ? ' error' : ''}`}
            type="number"
            min={1}
            max={65535}
          />
          {errors.port && <span className="field-error">{errors.port.message}</span>}
        </div>
      </div>

      {/* DB 종류별 입력 필드 */}
      <DbFields dbType={dbType as DbType} register={register} errors={errors} />

      {/* Username / Password */}
      <div className="field-row">
        <div className="field field-grow">
          <label htmlFor="username">
            사용자명 <span className="required">*</span>
          </label>
          <input
            id="username"
            {...register('username')}
            className={`conn-input${errors.username ? ' error' : ''}`}
            autoComplete="username"
          />
          {errors.username && (
            <span className="field-error">{errors.username.message}</span>
          )}
        </div>

        <div className="field field-grow">
          <label htmlFor="password">
            비밀번호 <span className="required">*</span>
          </label>
          <PasswordField
            id="password"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <span className="field-error">{errors.password.message}</span>
          )}
        </div>
      </div>

      {/* 테스트 결과 */}
      <TestResultBanner status={testStatus} result={testResult} />

      {/* 저장 결과 */}
      {saveSuccess && (
        <div className="result-banner ok" role="status">
          연결 정보가 저장되었습니다.
        </div>
      )}
      {saveError && (
        <div className="result-banner fail" role="alert">
          {saveError}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="conn-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSubmit(testConnection)}
          disabled={testStatus === 'testing'}
        >
          {testStatus === 'testing' ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit(saveConnection)}
          disabled={isSaving}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
