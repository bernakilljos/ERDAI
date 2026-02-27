/**
 * DB 스키마 텍스트 export — DBML / Mermaid erDiagram
 * Python Worker의 export 기능을 대체합니다.
 */

import type { WorkerExtractResult, WorkerRelation } from './workerClient'

// ── DBML ──────────────────────────────────────────────────────────────────────
export function buildDbml(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): string {
  const lines: string[] = [
    `// DBML generated from ${metadata.schema_name}`,
    `// Extracted at: ${metadata.extracted_at}`,
    '',
  ]

  for (const table of metadata.tables) {
    const noteStr = table.comment
      ? ` [note: '${table.comment.replace(/'/g, "''")}']`
      : ''
    lines.push(`Table ${table.name}${noteStr} {`)

    for (const col of table.columns) {
      const parts: string[] = []
      if (col.is_pk) parts.push('pk')
      if (!col.nullable) parts.push('not null')
      if (col.default_value !== undefined && col.default_value !== null) {
        parts.push(`default: \`${col.default_value}\``)
      }
      if (col.comment) {
        parts.push(`note: '${col.comment.replace(/'/g, "''")}'`)
      }
      const constraintStr = parts.length > 0 ? ` [${parts.join(', ')}]` : ''
      lines.push(`  ${col.name} ${col.data_type}${constraintStr}`)
    }
    lines.push('}')
    lines.push('')
  }

  // FK 기반 Ref만 추가 (패턴 추론 포함 HIGH 이상)
  const refLines = relations
    .filter(r => r.confidence === 'FK' || r.confidence === 'HIGH')
    .map(r => {
      const arrow = r.cardinality === '1:1' ? '-' : '>'
      return `Ref: ${r.source_table}.${r.source_column} ${arrow} ${r.target_table}.${r.target_column}`
    })

  if (refLines.length > 0) {
    lines.push('// References')
    lines.push(...refLines)
  }

  return lines.join('\n')
}

// ── Mermaid erDiagram ─────────────────────────────────────────────────────────
export function buildMermaid(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): string {
  const lines: string[] = ['erDiagram']

  for (const table of metadata.tables) {
    lines.push(`  ${table.name} {`)
    for (const col of table.columns) {
      // Mermaid는 공백/특수문자 없는 type만 허용
      const safeType = col.data_type
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '')
        || 'unknown'
      const pkMark = col.is_pk ? ' PK' : ''
      const commentMark = col.comment ? ` "${col.comment}"` : ''
      lines.push(`    ${safeType} ${col.name}${pkMark}${commentMark}`)
    }
    lines.push('  }')
  }

  if (relations.length > 0) {
    lines.push('')
    for (const rel of relations) {
      const card = toMermaidCard(rel.cardinality)
      const label = (rel.reason ?? rel.confidence).replace(/"/g, '')
      lines.push(`  ${rel.source_table} ${card} ${rel.target_table} : "${label}"`)
    }
  }

  return lines.join('\n')
}

function toMermaidCard(card: string): string {
  switch (card) {
    case '1:1': return '||--||'
    case '1:N': return '||--o{'
    case 'N:1': return '}o--||'
    case 'N:M': return '}o--o{'
    default:    return '||--o{'
  }
}
