/**
 * Node.js 직접 DB 연결 — MySQL / MSSQL 메타데이터 추출
 * Oracle은 현재 미지원 (Python Worker 사용 권고)
 */

import type { WorkerExtractResult } from './workerClient'

export interface DbConnectParams {
  dbType: 'mysql' | 'mssql' | 'oracle'
  host: string
  port: number
  database?: string
  serviceName?: string
  sid?: string
  username: string
  password: string
}

export interface DbTestResult {
  success: boolean
  dbVersion: string
  message: string
}

// ── 도메인 추론 ────────────────────────────────────────────────────────────────
function inferDomain(tableName: string): string {
  const first = tableName.toLowerCase().split('_')[0]
  const MAP: Record<string, string> = {
    ord: 'ORDER', order: 'ORDER',
    usr: 'USER', user: 'USER', mem: 'USER',
    prd: 'PRODUCT', prod: 'PRODUCT', item: 'PRODUCT',
    pay: 'PAYMENT', bill: 'PAYMENT',
    shp: 'SHIPPING', dlv: 'SHIPPING',
    sys: 'SYSTEM', cfg: 'SYSTEM', conf: 'SYSTEM',
    cd: 'CODE', code: 'CODE', cmn: 'CODE',
  }
  return MAP[first] ?? 'ETC'
}

// ── 공통 에러 변환 ─────────────────────────────────────────────────────────────
function translateDbError(err: unknown): string {
  const e = err as NodeJS.ErrnoException & { code?: string; number?: number }
  const msg = (err as Error).message ?? ''
  const code = e.code ?? ''

  if (code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT'))
    return `연결 시간 초과: 호스트(${(err as NodeJS.ErrnoException & { address?: string }).address ?? ''}) 에 접근할 수 없습니다. 호스트·포트·방화벽을 확인해주세요.`
  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED'))
    return '연결 거부: 해당 호스트·포트에서 DB가 실행 중인지 확인해주세요.'
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND'))
    return '호스트를 찾을 수 없습니다. 호스트명(IP)을 다시 확인해주세요.'
  if (code === 'ER_ACCESS_DENIED_ERROR' || msg.includes('Access denied'))
    return '인증 실패: 사용자명 또는 비밀번호를 확인해주세요.'
  if (code === 'ER_BAD_DB_ERROR' || msg.includes('Unknown database'))
    return '데이터베이스가 존재하지 않습니다. 데이터베이스명을 확인해주세요.'
  if (e.number === 18456) // MSSQL 로그인 실패
    return '인증 실패: 사용자명 또는 비밀번호를 확인해주세요.'
  if (e.number === 4060) // MSSQL DB 없음
    return '데이터베이스가 존재하지 않습니다. 데이터베이스명을 확인해주세요.'
  return msg || '알 수 없는 오류가 발생했습니다.'
}

// ── MySQL ──────────────────────────────────────────────────────────────────────
async function testMysql(conn: DbConnectParams): Promise<DbTestResult> {
  const { createConnection } = await import('mysql2/promise')
  let connection: Awaited<ReturnType<typeof createConnection>> | null = null
  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      database: conn.database,
      user: conn.username,
      password: conn.password,
      connectTimeout: 10_000,
    })
    const [rows] = await connection.query('SELECT VERSION() AS ver')
    const version = (rows as Array<{ ver: string }>)[0]?.ver ?? 'unknown'
    return { success: true, dbVersion: `MySQL ${version}`, message: '연결 성공' }
  } catch (err) {
    return { success: false, dbVersion: '', message: translateDbError(err) }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

async function extractMysql(conn: DbConnectParams): Promise<WorkerExtractResult> {
  const { createConnection } = await import('mysql2/promise')
  const db = conn.database!
  let connection: Awaited<ReturnType<typeof createConnection>> | null = null
  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      database: db,
      user: conn.username,
      password: conn.password,
      connectTimeout: 15_000,
    })
  } catch (err) {
    throw new Error(translateDbError(err))
  }
  try {
    const [tableRows] = await connection.query(
      `SELECT TABLE_NAME, TABLE_COMMENT
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [db],
    )
    const [allCols] = await connection.query(
      `SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, DATA_TYPE,
              IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [db],
    )
    const [allFks] = await connection.query(
      `SELECT KCU.TABLE_NAME, KCU.COLUMN_NAME, KCU.CONSTRAINT_NAME,
              KCU.REFERENCED_TABLE_NAME, KCU.REFERENCED_COLUMN_NAME,
              RC.UPDATE_RULE, RC.DELETE_RULE
       FROM information_schema.KEY_COLUMN_USAGE KCU
       JOIN information_schema.REFERENTIAL_CONSTRAINTS RC
         ON RC.CONSTRAINT_NAME = KCU.CONSTRAINT_NAME
         AND RC.CONSTRAINT_SCHEMA = KCU.TABLE_SCHEMA
       WHERE KCU.TABLE_SCHEMA = ?`,
      [db],
    )

    const tRows = tableRows as Array<Record<string, unknown>>
    const cRows = allCols as Array<Record<string, unknown>>
    const fRows = allFks as Array<Record<string, unknown>>

    const colMap = new Map<string, Array<Record<string, unknown>>>()
    for (const c of cRows) {
      const key = c['TABLE_NAME'] as string
      if (!colMap.has(key)) colMap.set(key, [])
      colMap.get(key)!.push(c)
    }
    const fkMap = new Map<string, Array<Record<string, unknown>>>()
    for (const f of fRows) {
      const key = f['TABLE_NAME'] as string
      if (!fkMap.has(key)) fkMap.set(key, [])
      fkMap.get(key)!.push(f)
    }

    const tables: WorkerExtractResult['tables'] = tRows.map(t => {
      const cols = colMap.get(t['TABLE_NAME'] as string) ?? []
      const fks = fkMap.get(t['TABLE_NAME'] as string) ?? []
      const pkCols = cols
        .filter((c: Record<string, unknown>) => c['COLUMN_KEY'] === 'PRI')
        .map((c: Record<string, unknown>) => c['COLUMN_NAME'] as string)

      return {
        name: t['TABLE_NAME'] as string,
        comment: (t['TABLE_COMMENT'] as string) || undefined,
        domain: inferDomain(t['TABLE_NAME'] as string),
        columns: cols.map((c, i) => ({
          col_no: (c['ORDINAL_POSITION'] as number) ?? i + 1,
          name: c['COLUMN_NAME'] as string,
          data_type: (c['COLUMN_TYPE'] as string) ?? (c['DATA_TYPE'] as string),
          nullable: c['IS_NULLABLE'] === 'YES',
          key_type: (c['COLUMN_KEY'] as string) ?? '',
          is_pk: c['COLUMN_KEY'] === 'PRI',
          default_value: c['COLUMN_DEFAULT'] as string | undefined ?? undefined,
          extra: (c['EXTRA'] as string) || undefined,
          comment: (c['COLUMN_COMMENT'] as string) || undefined,
        })),
        pk_columns: pkCols,
        fk_refs: fks.map(f => ({
          column_name: f['COLUMN_NAME'] as string,
          constraint_name: f['CONSTRAINT_NAME'] as string,
          ref_table: f['REFERENCED_TABLE_NAME'] as string,
          ref_column: f['REFERENCED_COLUMN_NAME'] as string,
          update_rule: (f['UPDATE_RULE'] as string) || undefined,
          delete_rule: (f['DELETE_RULE'] as string) || undefined,
        })),
      }
    })

    return {
      schema_name: db,
      table_count: tables.length,
      column_count: tables.reduce((s: number, t) => s + t.columns.length, 0),
      fk_count: tables.reduce((s: number, t) => s + t.fk_refs.length, 0),
      tables,
      extracted_at: new Date().toISOString(),
    }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

// ── MSSQL 공통: CJS 동적 임포트 후 ConnectionPool 클래스 추출 ───────────────────
// mssql@9 (Node 16 호환) — CJS 모듈이므로 .default 여부를 모두 처리
async function getMssqlPool(config: {
  server: string; port: number; database?: string
  user: string; password: string
  options: Record<string, unknown>; connectionTimeout: number
}): Promise<import('mssql').ConnectionPool> {
  const mod = await import('mssql')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Pool: typeof import('mssql').ConnectionPool = (mod as any).ConnectionPool ?? (mod as any).default?.ConnectionPool
  if (typeof Pool !== 'function') throw new Error('mssql 모듈 로드 실패: ConnectionPool을 찾을 수 없습니다.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = new Pool(config as any)
  await pool.connect()
  return pool
}

// ── MSSQL ──────────────────────────────────────────────────────────────────────
async function testMssql(conn: DbConnectParams): Promise<DbTestResult> {
  let pool: import('mssql').ConnectionPool | null = null
  try {
    pool = await getMssqlPool({
      server: conn.host,
      port: conn.port,
      database: conn.database,
      user: conn.username,
      password: conn.password,
      options: { encrypt: false, trustServerCertificate: true },
      connectionTimeout: 10_000,
    })
    const result = await pool.request().query('SELECT @@VERSION AS ver')
    const ver = (result.recordset[0]?.ver as string) ?? 'unknown'
    const shortVer = ver.split('\n')[0].trim()
    return { success: true, dbVersion: shortVer, message: '연결 성공' }
  } catch (err) {
    return { success: false, dbVersion: '', message: translateDbError(err) }
  } finally {
    await pool?.close().catch(() => undefined)
  }
}

async function extractMssql(conn: DbConnectParams): Promise<WorkerExtractResult> {
  const db = conn.database!
  let pool: import('mssql').ConnectionPool | null = null
  try {
    pool = await getMssqlPool({
      server: conn.host,
      port: conn.port,
      database: db,
      user: conn.username,
      password: conn.password,
      options: { encrypt: false, trustServerCertificate: true },
      connectionTimeout: 15_000,
    })
  } catch (err) {
    throw new Error(translateDbError(err))
  }
  try {
    const tablesResult = await pool.request().query(`
      SELECT t.name AS TABLE_NAME,
             CAST(ep.value AS NVARCHAR(MAX)) AS TABLE_COMMENT
      FROM sys.tables t
      LEFT JOIN sys.extended_properties ep
        ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
      ORDER BY t.name
    `)
    const colsResult = await pool.request().query(`
      SELECT OBJECT_NAME(c.object_id) AS TABLE_NAME,
             c.column_id AS ORDINAL_POSITION,
             c.name AS COLUMN_NAME,
             tp.name AS DATA_TYPE,
             c.max_length, c.precision, c.scale,
             c.is_nullable AS IS_NULLABLE,
             c.is_identity,
             CAST(ep.value AS NVARCHAR(MAX)) AS COLUMN_COMMENT,
             dc.definition AS COLUMN_DEFAULT
      FROM sys.columns c
      JOIN sys.tables t2 ON t2.object_id = c.object_id
      JOIN sys.types tp ON tp.user_type_id = c.user_type_id
      LEFT JOIN sys.default_constraints dc
        ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
      LEFT JOIN sys.extended_properties ep
        ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `)
    const pkResult = await pool.request().query(`
      SELECT OBJECT_NAME(ic.object_id) AS TABLE_NAME, c.name AS COLUMN_NAME
      FROM sys.key_constraints kc
      JOIN sys.index_columns ic
        ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE kc.type = 'PK'
    `)
    const fkResult = await pool.request().query(`
      SELECT fk.name AS CONSTRAINT_NAME,
             tp.name AS TABLE_NAME,
             cp.name AS COLUMN_NAME,
             tr.name AS REFERENCED_TABLE_NAME,
             cr.name AS REFERENCED_COLUMN_NAME,
             fk.update_referential_action_desc AS UPDATE_RULE,
             fk.delete_referential_action_desc AS DELETE_RULE
      FROM sys.foreign_key_columns fkc
      JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id
      JOIN sys.tables tp ON tp.object_id = fkc.parent_object_id
      JOIN sys.columns cp ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
      JOIN sys.tables tr ON tr.object_id = fkc.referenced_object_id
      JOIN sys.columns cr ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
    `)

    const colMap = new Map<string, Array<Record<string, unknown>>>()
    for (const c of colsResult.recordset) {
      const key = c['TABLE_NAME'] as string
      if (!colMap.has(key)) colMap.set(key, [])
      colMap.get(key)!.push(c as Record<string, unknown>)
    }
    const pkMap = new Map<string, Set<string>>()
    for (const p of pkResult.recordset) {
      const key = p['TABLE_NAME'] as string
      if (!pkMap.has(key)) pkMap.set(key, new Set())
      pkMap.get(key)!.add(p['COLUMN_NAME'] as string)
    }
    const fkMap = new Map<string, Array<Record<string, unknown>>>()
    for (const f of fkResult.recordset) {
      const key = f['TABLE_NAME'] as string
      if (!fkMap.has(key)) fkMap.set(key, [])
      fkMap.get(key)!.push(f as Record<string, unknown>)
    }

    const colTypeStr = (c: Record<string, unknown>) => {
      const base = c['DATA_TYPE'] as string
      const maxLen = c['max_length'] as number
      const prec = c['precision'] as number
      const scale = c['scale'] as number
      if (['varchar', 'nvarchar', 'char', 'nchar'].includes(base)) {
        const len = maxLen === -1 ? 'MAX' : base.startsWith('n') ? maxLen / 2 : maxLen
        return `${base}(${len})`
      }
      if (['decimal', 'numeric'].includes(base)) return `${base}(${prec},${scale})`
      return base
    }

    const tables: WorkerExtractResult['tables'] = tablesResult.recordset.map(t => {
      const tableName = t['TABLE_NAME'] as string
      const cols = colMap.get(tableName) ?? []
      const pkSet = pkMap.get(tableName) ?? new Set<string>()
      const fks = fkMap.get(tableName) ?? []

      return {
        name: tableName,
        comment: (t['TABLE_COMMENT'] as string) || undefined,
        domain: inferDomain(tableName),
        columns: cols.map(c => ({
          col_no: c['ORDINAL_POSITION'] as number,
          name: c['COLUMN_NAME'] as string,
          data_type: colTypeStr(c),
          nullable: c['IS_NULLABLE'] === true,
          key_type: pkSet.has(c['COLUMN_NAME'] as string) ? 'PRI' : '',
          is_pk: pkSet.has(c['COLUMN_NAME'] as string),
          default_value: (c['COLUMN_DEFAULT'] as string) ?? undefined,
          extra: (c['is_identity'] as boolean) ? 'IDENTITY' : undefined,
          comment: (c['COLUMN_COMMENT'] as string) || undefined,
        })),
        pk_columns: [...pkSet],
        fk_refs: fks.map(f => ({
          column_name: f['COLUMN_NAME'] as string,
          constraint_name: f['CONSTRAINT_NAME'] as string,
          ref_table: f['REFERENCED_TABLE_NAME'] as string,
          ref_column: f['REFERENCED_COLUMN_NAME'] as string,
          update_rule: (f['UPDATE_RULE'] as string) || undefined,
          delete_rule: (f['DELETE_RULE'] as string) || undefined,
        })),
      }
    })

    return {
      schema_name: db,
      table_count: tables.length,
      column_count: tables.reduce((s: number, t) => s + t.columns.length, 0),
      fk_count: tables.reduce((s: number, t) => s + t.fk_refs.length, 0),
      tables,
      extracted_at: new Date().toISOString(),
    }
  } finally {
    await pool?.close().catch(() => undefined)
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function testDbConnection(conn: DbConnectParams): Promise<DbTestResult> {
  if (conn.dbType === 'oracle') {
    return {
      success: false,
      dbVersion: '',
      message: 'Oracle은 현재 미지원입니다. Python Worker를 사용해주세요.',
    }
  }
  if (conn.dbType === 'mysql') return testMysql(conn)
  if (conn.dbType === 'mssql') return testMssql(conn)
  return { success: false, dbVersion: '', message: `지원하지 않는 DB 타입: ${conn.dbType}` }
}

export async function extractMetadata(conn: DbConnectParams): Promise<WorkerExtractResult> {
  if (conn.dbType === 'oracle') {
    throw new Error('Oracle은 현재 미지원입니다. Python Worker를 사용해주세요.')
  }
  if (conn.dbType === 'mysql') return extractMysql(conn)
  if (conn.dbType === 'mssql') return extractMssql(conn)
  throw new Error(`지원하지 않는 DB 타입: ${conn.dbType}`)
}
