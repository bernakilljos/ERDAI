/**
 * Python Worker HTTP 클라이언트
 *
 * WORKER_STUB=true 환경에서는 실제 Worker 없이 stub 응답을 반환합니다.
 * Python Worker 구현 완료 후 WORKER_STUB=false로 전환하세요.
 */

const WORKER_BASE = process.env.PY_WORKER_URL ?? 'http://localhost:8000'
const TIMEOUT_MS  = 5_000  // 5초 (agent/db-connection.md 기준)

const IS_STUB = process.env.WORKER_STUB === 'true'

// ── Worker 응답 타입 ───────────────────────────────────────────────────────────
export interface WorkerTestResult {
  success:    boolean
  message:    string
  dbVersion?: string
  errorCode?: WorkerErrorCode
}

export type WorkerErrorCode =
  | 'AUTH_FAILED'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN'

// ── Worker 요청 페이로드 (snake_case: Python 컨벤션) ───────────────────────────
export interface WorkerTestPayload {
  db_type:       string
  host:          string
  port:          number
  database?:     string
  service_name?: string
  sid?:          string
  username:      string
  password:      string  // Worker로만 전달, 서버 로깅에는 미노출
}

export interface WorkerExtractResult {
  schema_name: string
  table_count: number
  column_count: number
  fk_count: number
  tables: Array<{
    name: string
    comment?: string
    domain?: string
    columns: Array<{
      col_no: number
      name: string
      data_type: string
      nullable: boolean
      key_type: string
      is_pk: boolean
      default_value?: string
      extra?: string
      comment?: string
    }>
    pk_columns: string[]
    fk_refs: Array<{
      column_name: string
      constraint_name: string
      ref_table: string
      ref_column: string
      update_rule?: string
      delete_rule?: string
    }>
  }>
  extracted_at: string
}

export type WorkerConfidence = 'FK' | 'HIGH' | 'MEDIUM' | 'LOW'
export type WorkerCardinality = '1:1' | '1:N' | 'N:1' | 'N:M'

export interface WorkerRelation {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  confidence: WorkerConfidence
  cardinality: WorkerCardinality
  reason?: string
  evidence?: string
  score?: number
}

export interface WorkerBuildErdResult {
  tables: Array<{
    name: string
    comment?: string
    domain?: string
    columns: Array<{
      name: string
      data_type: string
      nullable: boolean
      is_pk: boolean
      is_fk: boolean
      comment?: string
    }>
  }>
  relations: WorkerRelation[]
  extracted_at: string
}

// ── Stub 응답 ──────────────────────────────────────────────────────────────────
const DB_VERSION_STUB: Record<string, string> = {
  mysql:  'MySQL 8.0.36 (stub)',
  mssql:  'Microsoft SQL Server 2019 (stub)',
  oracle: 'Oracle 19c (stub)',
}

async function stubTestConnection(payload: WorkerTestPayload): Promise<WorkerTestResult> {
  // 실제 지연처럼 보이도록
  await new Promise(r => setTimeout(r, 300))
  return {
    success:   true,
    message:   '연결 성공 (stub 모드)',
    dbVersion: DB_VERSION_STUB[payload.db_type] ?? '버전 없음 (stub)',
  }
}

const STUB_METADATA: WorkerExtractResult = {
  schema_name: 'stub_schema',
  table_count: 2,
  column_count: 6,
  fk_count: 1,
  extracted_at: new Date().toISOString(),
  tables: [
    {
      name: 'user',
      comment: '사용자',
      domain: 'AUTH',
      pk_columns: ['user_id'],
      columns: [
        { col_no: 1, name: 'user_id', data_type: 'bigint', nullable: false, key_type: 'PRI', is_pk: true, comment: 'PK' },
        { col_no: 2, name: 'login_id', data_type: 'varchar(50)', nullable: false, key_type: 'UNI', is_pk: false, comment: '로그인 ID' },
        { col_no: 3, name: 'user_name', data_type: 'varchar(100)', nullable: false, key_type: '', is_pk: false, comment: '이름' },
      ],
      fk_refs: [],
    },
    {
      name: 'project',
      comment: '프로젝트',
      domain: 'PRJ',
      pk_columns: ['project_id'],
      columns: [
        { col_no: 1, name: 'project_id', data_type: 'bigint', nullable: false, key_type: 'PRI', is_pk: true, comment: 'PK' },
        { col_no: 2, name: 'project_name', data_type: 'varchar(100)', nullable: false, key_type: '', is_pk: false, comment: '프로젝트명' },
        { col_no: 3, name: 'owner_id', data_type: 'bigint', nullable: false, key_type: 'MUL', is_pk: false, comment: '소유자' },
      ],
      fk_refs: [
        { column_name: 'owner_id', constraint_name: 'fk_project_user', ref_table: 'user', ref_column: 'user_id' },
      ],
    },
  ],
}

const STUB_RELATIONS: WorkerRelation[] = [
  {
    source_table: 'project',
    source_column: 'owner_id',
    target_table: 'user',
    target_column: 'user_id',
    confidence: 'FK',
    cardinality: 'N:1',
    reason: 'FK constraint',
    evidence: 'project.owner_id -> user.user_id',
  },
]

// ── 실제 Worker 호출 ───────────────────────────────────────────────────────────
async function callWorker(payload: WorkerTestPayload): Promise<WorkerTestResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${WORKER_BASE}/worker/test-connection`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    })

    const data = (await res.json()) as WorkerTestResult

    if (!res.ok) {
      return {
        success:   false,
        message:   data.message ?? 'Worker 오류',
        errorCode: data.errorCode ?? 'UNKNOWN',
      }
    }
    return data
  } catch (err) {
    const error = err as Error
    if (error.name === 'AbortError') {
      return { success: false, message: '연결 시간 초과 (5초)', errorCode: 'TIMEOUT' }
    }
    // Worker 서버 자체가 죽어있을 때
    return {
      success:   false,
      message:   `Worker 서버에 연결할 수 없습니다: ${error.message}`,
      errorCode: 'UNKNOWN',
    }
  } finally {
    clearTimeout(timer)
  }
}

// ── 공개 인터페이스 ───────────────────────────────────────────────────────────
export async function workerTestConnection(
  payload: WorkerTestPayload,
): Promise<WorkerTestResult> {
  if (IS_STUB) return stubTestConnection(payload)
  return callWorker(payload)
}

export async function workerExtractMetadata(
  payload: WorkerTestPayload,
): Promise<WorkerExtractResult> {
  if (IS_STUB) return STUB_METADATA

  const res = await fetch(`${WORKER_BASE}/worker/extract-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? '메타데이터 추출 실패')
  }
  return res.json() as Promise<WorkerExtractResult>
}

export async function workerInferRelations(
  metadata: WorkerExtractResult,
): Promise<WorkerRelation[]> {
  if (IS_STUB) return STUB_RELATIONS
  const res = await fetch(`${WORKER_BASE}/worker/infer-relations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? '관계 추론 실패')
  }
  return res.json() as Promise<WorkerRelation[]>
}

export async function workerBuildErd(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): Promise<WorkerBuildErdResult> {
  if (IS_STUB) {
    return {
      tables: STUB_METADATA.tables.map(t => ({
        name: t.name,
        comment: t.comment,
        domain: t.domain,
        columns: t.columns.map(c => ({
          name: c.name,
          data_type: c.data_type,
          nullable: c.nullable,
          is_pk: c.is_pk,
          is_fk: t.fk_refs.some(f => f.column_name === c.name),
          comment: c.comment,
        })),
      })),
      relations: STUB_RELATIONS,
      extracted_at: STUB_METADATA.extracted_at,
    }
  }

  const res = await fetch(`${WORKER_BASE}/worker/build-erd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, relations }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'ERD 빌드 실패')
  }
  return res.json() as Promise<WorkerBuildErdResult>
}

export async function workerExportDbml(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): Promise<string> {
  if (IS_STUB) return '// DBML (stub)\n'
  const res = await fetch(`${WORKER_BASE}/worker/export/dbml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, relations }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'DBML export 실패')
  }
  return res.text()
}

export async function workerExportMermaid(
  metadata: WorkerExtractResult,
  relations: WorkerRelation[],
): Promise<string> {
  if (IS_STUB) return 'erDiagram\n'
  const res = await fetch(`${WORKER_BASE}/worker/export/mermaid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, relations }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'Mermaid export 실패')
  }
  return res.text()
}
