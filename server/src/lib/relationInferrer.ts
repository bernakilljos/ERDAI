/**
 * 관계 추론 — FK constraint + 컬럼명 패턴 기반
 * CLAUDE.md 기준:
 *   FK constraint → 'FK' (1.0)
 *   _id + 대응 테이블 → HIGH (0.8~0.9)
 *   _cd/_code → MEDIUM (0.65)
 *   _no → LOW (0.5)
 */

import type { WorkerExtractResult, WorkerRelation } from './workerClient'

export function inferRelations(metadata: WorkerExtractResult): WorkerRelation[] {
  const relations: WorkerRelation[] = []
  const tableNameMap = new Map<string, string>() // lowercase → original
  for (const t of metadata.tables) {
    tableNameMap.set(t.name.toLowerCase(), t.name)
  }
  const pkMap = new Map<string, string>() // tableName → first PK column name
  for (const t of metadata.tables) {
    pkMap.set(t.name, t.pk_columns[0] ?? 'id')
  }

  // 1. FK constraints
  for (const table of metadata.tables) {
    for (const fk of table.fk_refs) {
      relations.push({
        source_table: table.name,
        source_column: fk.column_name,
        target_table: fk.ref_table,
        target_column: fk.ref_column,
        confidence: 'FK',
        cardinality: '1:N',
        reason: `FK constraint: ${fk.constraint_name}`,
        evidence: `${table.name}.${fk.column_name} → ${fk.ref_table}.${fk.ref_column}`,
        score: 1.0,
      })
    }
  }

  // FK 등록된 컬럼 추적 (중복 제외)
  const registered = new Set<string>(
    relations.map(r => `${r.source_table}.${r.source_column}`),
  )

  // 테이블명 prefix 후보 추출 헬퍼
  const findTable = (prefix: string): string | null => {
    const lower = prefix.toLowerCase()
    // 정확 일치
    if (tableNameMap.has(lower)) return tableNameMap.get(lower)!
    // 접미사 _prefix 또는 prefix_ 로 시작하는 테이블
    for (const [tLower, tOrig] of tableNameMap) {
      if (tLower === lower) return tOrig
      if (tLower.endsWith(`_${lower}`) || tLower.startsWith(`${lower}_`)) return tOrig
    }
    return null
  }

  // 2. 패턴 기반 추론
  for (const table of metadata.tables) {
    for (const col of table.columns) {
      const key = `${table.name}.${col.name}`
      if (registered.has(key)) continue
      if (col.is_pk) continue

      const colLower = col.name.toLowerCase()

      // _id 패턴
      if (colLower.endsWith('_id')) {
        const prefix = colLower.slice(0, -3)
        const targetName = findTable(prefix)
        if (targetName) {
          const targetPk = pkMap.get(targetName) ?? 'id'
          const hasComment = !!(col.comment?.includes(targetName))
          relations.push({
            source_table: table.name,
            source_column: col.name,
            target_table: targetName,
            target_column: targetPk,
            confidence: 'HIGH',
            cardinality: 'N:1',
            reason: '_id 패턴 매칭',
            evidence: `${col.name} → ${targetName}.${targetPk}`,
            score: hasComment ? 0.9 : 0.8,
          })
          registered.add(key)
        }
        continue
      }

      // _cd / _code 패턴
      if (colLower.endsWith('_cd') || colLower.endsWith('_code')) {
        const suffix = colLower.endsWith('_cd') ? '_cd' : '_code'
        const prefix = colLower.slice(0, -suffix.length)
        const targetName = findTable(prefix)
        if (targetName) {
          const targetPk = pkMap.get(targetName) ?? col.name
          relations.push({
            source_table: table.name,
            source_column: col.name,
            target_table: targetName,
            target_column: targetPk,
            confidence: 'MEDIUM',
            cardinality: 'N:1',
            reason: '_cd/_code 패턴 매칭',
            evidence: `${col.name} → ${targetName}.${targetPk}`,
            score: 0.65,
          })
          registered.add(key)
        }
        continue
      }

      // _no 패턴
      if (colLower.endsWith('_no')) {
        const prefix = colLower.slice(0, -3)
        const targetName = findTable(prefix)
        if (targetName) {
          const targetPk = pkMap.get(targetName) ?? col.name
          relations.push({
            source_table: table.name,
            source_column: col.name,
            target_table: targetName,
            target_column: targetPk,
            confidence: 'LOW',
            cardinality: 'N:1',
            reason: '_no 패턴 매칭',
            evidence: `${col.name} → ${targetName}.${targetPk}`,
            score: 0.5,
          })
          registered.add(key)
        }
      }
    }
  }

  // 중복 제거 (안전망)
  const seen = new Set<string>()
  return relations.filter(r => {
    const k = `${r.source_table}.${r.source_column}->${r.target_table}.${r.target_column}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
