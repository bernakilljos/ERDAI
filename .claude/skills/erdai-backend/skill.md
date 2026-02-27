# ERDAI Backend Skill (Node API)

## 참조 문서
- `agent/api.md`
- `agent/backend.md`
- `agent/db-connection.md`

## 현재 구현 상태

### ✅ 완료
- `src/app.ts` — Express 앱, CORS(localhost:3000), 라우터 등록
- `src/index.ts` — bootstrap() → app.listen()
- `src/lib/jsonStore.ts` — 파일 기반 JSON 영속화, Mutex 원자 쓰기
- `src/lib/bootstrap.ts` — 서버 시작 시 admin/기본 프로젝트 자동 생성
- `src/lib/workerClient.ts` — WORKER_STUB + 실제 Worker 호출 (6개 함수)
- `src/lib/erdBuilder.ts` — WorkerBuildErdResult → ErdGraph 변환
- `src/lib/respond.ts` — ok() / fail() 표준 응답
- `modules/auth/` — 쿠키 세션 (login/me/logout/change-password)
- `modules/connections/` — test/create/list
- `modules/projects/` — CRUD + reset
- `modules/metadata/` — extract
- `modules/erd/` — get/sync/export/dbml/export/mermaid

### ❌ 남은 작업
1. **`server/.env` 생성** — `.env.example` 복사, `WORKER_STUB=true` 설정
2. **dead code 삭제** — `src/lib/prisma.ts`, `src/lib/store.ts`
3. **Auth 미들웨어** — `/projects`, `/connections`, `/erd`, `/metadata` 보호
4. **Connection 저장 projectId** — `handleCreateConnection`에서 body의 projectId 우선 사용 (현재 fallback만)
5. **연결 삭제** — `jsonStore.deleteConnection()` + `DELETE /connections/:id`
6. **DB 자격증명 암호화** — `DB_CRED_ENCRYPTION_KEY` 사용 (운영 전 필수)
7. **vitest 테스트** — auth/connections/erd 핵심 경로

## 데이터 구조 (jsonStore)
```
server/data/
  users.json                    # { users: UserRecord[] }
  projects/
    {projectId}.json            # { project, connections, snapshots, graphs }
```

## 환경변수 (server/.env)
```
API_PORT=4000
APP_ENV=local
PY_WORKER_URL=http://localhost:8000
WORKER_STUB=true          # false로 바꾸면 실제 Python Worker 호출
JWT_SECRET=CHANGE_ME
DB_CRED_ENCRYPTION_KEY=CHANGE_ME_32BYTE
```

## 표준 응답 포맷
```typescript
// 성공: ok(res, data)
{ "data": {...} }

// 실패: fail(res, status, message, extras?)
{ "message": "...", "details": [...] }
```

## 원칙
- 입력 검증: Zod safeParse 필수
- 비밀번호/토큰 로그 절대 금지
- Worker 호출 실패 시 500 + 에러 메시지
