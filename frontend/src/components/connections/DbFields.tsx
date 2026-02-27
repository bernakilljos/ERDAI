import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { ConnectionFormValues } from '../../lib/connectionSchema'
import type { DbType } from '../../types/connection'

interface Props {
  dbType: DbType
  register: UseFormRegister<ConnectionFormValues>
  errors: FieldErrors<ConnectionFormValues>
}

/**
 * DB 종류에 따라 동적으로 렌더링되는 입력 필드
 * - MySQL / MSSQL: Database
 * - Oracle: Service Name 또는 SID (둘 중 하나 필요)
 */
export default function DbFields({ dbType, register, errors }: Props) {
  if (dbType === 'oracle') {
    return (
      <div className="field-row">
        <div className="field field-flex-1">
          <label htmlFor="serviceName">Service Name</label>
          <input
            id="serviceName"
            {...register('serviceName')}
            className={`conn-input${errors.serviceName ? ' error' : ''}`}
            placeholder="orcl"
          />
          {errors.serviceName && (
            <span className="field-error">{errors.serviceName.message}</span>
          )}
          <span className="field-hint">Service Name 또는 SID 중 하나 필요</span>
        </div>
        <div className="field field-flex-1">
          <label htmlFor="sid">SID</label>
          <input
            id="sid"
            {...register('sid')}
            className={`conn-input${errors.sid ? ' error' : ''}`}
            placeholder="XE"
          />
          {errors.sid && (
            <span className="field-error">{errors.sid.message}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor="database">
        Database <span className="required">*</span>
      </label>
      <input
        id="database"
        {...register('database')}
        className={`conn-input${errors.database ? ' error' : ''}`}
        placeholder={dbType === 'mysql' ? 'my_database' : 'MyDatabase'}
      />
      {errors.database && (
        <span className="field-error">{errors.database.message}</span>
      )}
    </div>
  )
}
