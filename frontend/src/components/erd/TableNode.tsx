import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ErdTable, ErdView } from '../../types/erd'
import { DOMAIN_COLORS } from '../../mock/erdMockData'

const MAX_VISIBLE = 8

export const TableNode = memo(function TableNode({ data, selected }: NodeProps) {
  const table = data as unknown as ErdTable & { view: ErdView }
  const isLogical = table.view === 'logical'
  const [expanded, setExpanded] = useState(false)

  const displayCols = isLogical
    ? table.columns.filter(c => c.isPk || c.isFk)
    : table.columns

  const visibleCols = expanded ? displayCols : displayCols.slice(0, MAX_VISIBLE)
  const hiddenCount = displayCols.length - MAX_VISIBLE

  const headerColor = DOMAIN_COLORS[table.domain] ?? DOMAIN_COLORS['ETC']

  return (
    <div className={`table-node${selected ? ' table-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Top} id="top" />

      <div className="table-node__header" style={{ background: headerColor }}>
        <span className="table-node__domain">{table.domain}</span>
        <div className="table-node__title-wrap">
          <span className="table-node__name">{table.name}</span>
          {table.comment && (
            <span className="table-node__comment">{table.comment}</span>
          )}
        </div>
      </div>

      <div className="table-node__cols">
        {visibleCols.map(col => (
          <div
            key={col.name}
            className={`table-node__col${col.isPk ? ' table-node__col--pk' : ''}`}
          >
            <div className="table-node__col-badges">
              {col.isPk && <span className="badge badge--pk">PK</span>}
              {col.isFk && !col.isPk && <span className="badge badge--fk">FK</span>}
              {!col.isPk && !col.isFk && !col.nullable && (
                <span className="badge badge--nn">NN</span>
              )}
            </div>
            <span className="table-node__col-name">{col.name}</span>
            {!isLogical && (
              <span className="table-node__col-type">{col.dataType}</span>
            )}
          </div>
        ))}

        {!expanded && hiddenCount > 0 && (
          <button
            className="table-node__more-btn"
            onClick={e => { e.stopPropagation(); setExpanded(true) }}
          >
            +{hiddenCount} 더보기
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            className="table-node__more-btn"
            onClick={e => { e.stopPropagation(); setExpanded(false) }}
          >
            접기
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  )
})
