import type { DbType } from '../../types/connection'

const DB_OPTIONS: { value: DbType; label: string; defaultPort: number }[] = [
  { value: 'mysql',  label: 'MySQL',  defaultPort: 3306 },
  { value: 'mssql',  label: 'MSSQL',  defaultPort: 1433 },
  { value: 'oracle', label: 'Oracle', defaultPort: 1521 },
]

interface Props {
  value: DbType
  onChange: (type: DbType) => void
}

export default function DbTypeSelector({ value, onChange }: Props) {
  return (
    <div className="db-type-selector" role="group" aria-label="DB 종류 선택">
      {DB_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`db-type-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
