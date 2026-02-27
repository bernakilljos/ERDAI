import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge, type EdgeProps } from '@xyflow/react'
import type { ErdRelation, ConfidenceLevel } from '../../types/erd'

interface EdgeStyle {
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
}

const EDGE_STYLES: Record<ConfidenceLevel, EdgeStyle> = {
  FK:     { stroke: '#374151', strokeWidth: 2.5 },
  HIGH:   { stroke: '#2196f3', strokeWidth: 1.5 },
  MEDIUM: { stroke: '#ff9800', strokeWidth: 1.5, strokeDasharray: '6,3' },
  LOW:    { stroke: '#aaa',    strokeWidth: 1,   strokeDasharray: '3,3' },
}

const LABEL_CLASSES: Record<ConfidenceLevel, string> = {
  FK:     'edge-label--fk',
  HIGH:   'edge-label--high',
  MEDIUM: 'edge-label--medium',
  LOW:    'edge-label--low',
}

export function RelationEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const rel = data as ErdRelation | undefined
  const confidence: ConfidenceLevel = rel?.confidence ?? 'MEDIUM'
  const edgeStyle = EDGE_STYLES[confidence]

  // getSmoothStepPath: 직각 라우팅으로 노드 겹침 없이 명확한 연결선
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />
      {rel && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label ${LABEL_CLASSES[confidence]}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 10,
            }}
            title={`${rel.reason}${rel.evidence ? ` (${rel.evidence})` : ''}`}
          >
            {confidence === 'FK' ? rel.cardinality : `${confidence} ${rel.cardinality}`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
