import { testDbConnection } from '../../lib/dbMetadata'
import type { ConnectionTestDto } from './connections.dto'

export interface TestConnectionResult {
  success:    boolean
  message:    string
  dbVersion?: string
}

export async function testConnection(
  dto: ConnectionTestDto,
): Promise<TestConnectionResult> {
  // 로그: 민감정보(password)는 로그에 미노출
  console.log(
    `[connections/test] dbType=${dto.dbType} host=${dto.host}:${dto.port} user=${dto.username}`,
  )

  const result = await testDbConnection({
    dbType:      dto.dbType,
    host:        dto.host,
    port:        dto.port,
    database:    dto.database,
    serviceName: dto.serviceName,
    sid:         dto.sid,
    username:    dto.username,
    password:    dto.password,
  })

  return {
    success:   result.success,
    message:   result.message,
    dbVersion: result.dbVersion || undefined,
  }
}
