import type { ErdTable, ErdRelation } from '../../types/erd'

interface Props {
  table: ErdTable
  relations: ErdRelation[]
  onClose: () => void
}

export function TableDetailDrawer({ table, relations, onClose }: Props) {
  return (
    <aside className="detail-drawer">
      <div className="detail-drawer__header">
        <div>
          <div className="detail-drawer__table-name">{table.name}</div>
          {table.comment && (
            <div className="detail-drawer__table-comment">{table.comment}</div>
          )}
        </div>
        <button className="detail-drawer__close" onClick={onClose} aria-label="닫기">
          닫기
        </button>
      </div>

      <section className="detail-drawer__section">
        <div className="detail-drawer__section-title">컬럼 ({table.columns.length})</div>
        <table className="detail-drawer__col-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>타입</th>
              <th>속성</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map(col => (
              <tr key={col.name} className={col.isPk ? 'row--pk' : ''}>
                <td className="col-name">{col.name}</td>
                <td className="col-type">{col.dataType}</td>
                <td className="col-badges">
                  {col.isPk && <span className="badge badge--pk">PK</span>}
                  {col.isFk && !col.isPk && <span className="badge badge--fk">FK</span>}
                  {!col.isPk && !col.isFk && !col.nullable && (
                    <span className="badge badge--nn">NN</span>
                  )}
                </td>
                <td className="col-comment">{col.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {relations.length > 0 && (
        <section className="detail-drawer__section">
          <div className="detail-drawer__section-title">관계 ({relations.length})</div>
          {relations.map(rel => {
            const isSource = rel.sourceTable === table.id
            const otherTable = isSource ? rel.targetTable : rel.sourceTable
            const arrow = isSource ? `→ ${otherTable}` : `← ${otherTable}`
            return (
              <div key={rel.id} className="detail-drawer__relation">
                <div className="detail-drawer__rel-header">
                  <span className={`filter-panel__conf-badge conf-badge--${rel.confidence.toLowerCase()}`}>
                    {rel.confidence}
                  </span>
                  <span className="detail-drawer__rel-arrow">{arrow}</span>
                  <span className="detail-drawer__rel-card">{rel.cardinality}</span>
                </div>
                {rel.reason && (
                  <div className="detail-drawer__rel-reason">
                    <span className="detail-drawer__rel-label">이유</span> {rel.reason}
                  </div>
                )}
                {rel.evidence && (
                  <div className="detail-drawer__rel-evidence">
                    <span className="detail-drawer__rel-label">근거</span> {rel.evidence}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}
    </aside>
  )
}

