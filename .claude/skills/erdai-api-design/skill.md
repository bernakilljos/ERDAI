# ERDAI API Design Skill

## 목적
프론트/백/워커 간 계약을 고정하고 변경 시 전파한다.

## 현재 확정된 계약

### Node API ↔ Frontend

```typescript
// 인증
POST /auth/login   body: { loginId: string, password: string }
                   res:  { data: { id, loginId, role, mustChangePassword } }

// 프로젝트
GET  /projects     res: { data: Project[] }   // { id, projectName, description }
POST /projects     body: { projectName: string, description?: string }

// 연결
GET  /connections  res: { data: SavedConnection[] }  // 비밀번호 미포함
POST /connections  body: { dbType, host, port, database?, username, password, projectId? }
POST /connections/test  body: 동일

// ERD
GET  /erd/:projectId           res: { data: ErdGraph }
POST /erd/:projectId/sync      body: { connectionId?: string }  res: { data: ErdGraph }
GET  /erd/:projectId/export/dbml     res: text/plain
GET  /erd/:projectId/export/mermaid  res: text/plain

// 프로젝트 초기화
POST /projects/:projectId/reset  res: { data: { message } }
```

### Node API ↔ Python Worker (snake_case)

```python
# workerClient.ts → worker.py
WorkerTestPayload:  { db_type, host, port, database?, service_name?, sid?, username, password }
WorkerExtractResult: { schema_name, table_count, column_count, fk_count, tables[], extracted_at }
WorkerRelation:     { source_table, source_column, target_table, target_column, confidence, cardinality, reason?, evidence?, score? }
WorkerBuildErdResult: { tables[], relations[], extracted_at }
```

### ErdGraph (Node API → Frontend, camelCase)
```typescript
ErdGraph: {
  projectId: string
  tables: ErdTable[]   // { id, name, comment, domain, columns[] }
  relations: ErdRelation[]  // { id, sourceTable, sourceColumn, targetTable, targetColumn, confidence, cardinality, reason?, evidence? }
  extractedAt: string
}
```

## 변환 레이어
- Node `workerClient.ts`: snake_case payload 조립
- Node `erdBuilder.ts`: snake_case Worker응답 → camelCase ErdGraph

## 미결 설계 사항
- `GET /projects/:projectId/connections` — projectId별 연결 목록 (현재 GET /connections 전체 반환)
- `DELETE /connections/:id` — 연결 삭제
- `POST /projects` 프론트 UI — 현재 bootstrap이 기본 프로젝트 1개만 생성
