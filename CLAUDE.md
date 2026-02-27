# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# ERDAI — ERD AI 분석 도구

DB 스키마를 분석해 관계를 추론하고, 인터랙티브 ERD를 생성하는 풀스택 도구.

## 목표
- 로그인 후 DB 연결 설정 (MySQL / MSSQL / Oracle)
- 메타데이터 추출 (테이블/컬럼/PK/FK/코멘트)
- ERD 생성 (React Flow 카드형 + 관계선) 및 관계 추론
- 문서화 (Mermaid / DBML export)

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | React (Vite 4.x) + TypeScript + @xyflow/react |
| 폼 | React Hook Form + Zod |
| Node API | Node.js 16 + Express + TypeScript (tsx 3.x) |
| Python Worker | FastAPI + pymysql / pymssql / oracledb |
| 데이터 저장 | 파일 기반 JSON (`server/data/`) — jsonStore |

## 포트 배분

```
Frontend : 3000  (npm run dev)
Node API : 4000  (npm run dev)
Python Worker : 8000  (uvicorn)
```

## 빠른 시작

```bash
# 1) server/.env 생성 (없으면 Worker 실제 호출 시도)
cp server/.env.example server/.env
# WORKER_STUB=true 확인 (Python Worker 없이 stub 응답)

# 2) Node API
cd server && npm install && npm run dev

# 3) Frontend
cd frontend && npm install && npm run dev

# 4) Python Worker (실제 DB 연결 필요 시)
cd worker
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

## 디렉터리 구조

```
ERDAI/
  agent/              # 기능별 설계 문서
    api.md            # API 계약 (엔드포인트/DTO)
    backend.md        # Node/Python 역할 분리
    db-connection.md  # DB 연결 UI + 메타 쿼리 (SQL 포함)
    erd-engine.md     # 관계 추론 파이프라인 + 점수 기준
    frontend.md       # 화면 목록 + 컴포넌트 구조
    login.md          # 인증 흐름 + 세션 정책
  docs/
    modeling/         # 논리/물리 모델, 네이밍 규칙, 도메인 사전
    erd/              # 논리/물리 ERD 관계 문서
  .claude/
    skills/           # 레이어별 구현 스킬
    hooks/            # pre/post-task, pre-commit 체크리스트
  server/             # Node.js API 서버
    src/
      app.ts          # Express 앱 (라우터 등록, CORS)
      index.ts        # 엔트리 (bootstrap → listen)
      lib/
        jsonStore.ts  # 파일 기반 JSON 영속화 (핵심 저장소)
        bootstrap.ts  # 서버 시작 시 admin/기본 프로젝트 자동 생성
        workerClient.ts # Python Worker HTTP 호출 + STUB 모드
        erdBuilder.ts # WorkerBuildErdResult → ErdGraph 변환
        respond.ts    # 표준 응답 헬퍼 ok() / fail()
      modules/
        auth/         # 쿠키 기반 세션 인증
        connections/  # DB 연결 저장/테스트
        projects/     # 프로젝트 CRUD + reset
        metadata/     # 메타데이터 추출
        erd/          # ERD get/sync/export
      types/          # erd.ts, worker.ts
    data/             # JSON 파일 저장소 (users.json, projects/*.json)
    .env.example      # 환경변수 템플릿 (반드시 .env로 복사)
  worker/             # Python FastAPI Worker
    app/
      routers/worker.py   # 전체 엔드포인트
      services/
        inference_service.py  # 관계 추론 로직
        export_service.py     # DBML/Mermaid 생성
        metadata_service.py   # 메타데이터 추출
        connectors/           # mysql/mssql/oracle 커넥터
      models/               # connection.py, metadata.py, erd.py
  frontend/           # React 앱
    src/
      api/            # authApi, connectionApi, projectApi, erdApi
      hooks/          # useErdGraph
      pages/          # LoginPage, ConnectionsPage, ErdStudioPage
      components/erd/ # TableNode, RelationEdge, FilterPanel, TableDetailDrawer
      types/          # erd.ts, project.ts, connection.ts
  TODO.md             # 현재 남은 작업 목록
  SAMPLE/HTML/        # 목표 산출물 샘플 (272 테이블 레퍼런스)
```

## 서버 아키텍처 핵심

### jsonStore (파일 기반 영속화)
- `server/data/users.json` — 사용자 목록
- `server/data/projects/{id}.json` — 프로젝트 + 연결 + 스냅샷 + 그래프
- Mutex로 원자적 파일 쓰기 (동시성 보장)
- 서버 재시작 후에도 데이터 유지

### bootstrap (자동 초기화)
- 서버 시작 시 admin 계정 (loginId: admin / password: admin / `mustChangePassword: true`) 자동 생성
- 프로젝트가 없으면 "기본 프로젝트" 자동 생성

### WORKER_STUB 모드
- `WORKER_STUB=true`: Python Worker 없이 stub 응답 반환 (개발/테스트용)
- `WORKER_STUB=false` (기본): Python Worker 실제 호출
- **반드시 `server/.env`를 `.env.example`로부터 복사해야 함**

### 인증 (쿠키 기반 세션)
- 로그인 → `erdai_session` HttpOnly 쿠키 발급
- 세션: in-memory Map (서버 재시작 시 로그아웃)
- 현재 `/projects`, `/connections`, `/erd` 라우터에 auth 미들웨어 미적용 상태 → TODO

## API 엔드포인트 (Node API)

```
POST /auth/login                    { loginId, password }
GET  /auth/me
POST /auth/logout
POST /auth/change-password

GET  /projects
POST /projects
GET  /projects/:projectId
PUT  /projects/:projectId
POST /projects/:projectId/reset     # 스냅샷/그래프 초기화

GET  /connections
POST /connections                   # { dbType, host, port, database, username, password, projectId? }
POST /connections/test

POST /metadata/extract

GET  /erd/:projectId
POST /erd/:projectId/sync           # { connectionId? } → 메타 재추출 + ERD 재계산
GET  /erd/:projectId/export/dbml
GET  /erd/:projectId/export/mermaid
```

## Python Worker 엔드포인트

```
GET  /worker/health
POST /worker/test-connection
POST /worker/extract-metadata
POST /worker/infer-relations
POST /worker/build-erd
POST /worker/export/dbml
POST /worker/export/mermaid
```

## 관계 추론 점수 기준

| 조건 | 신뢰도 |
|---|---|
| 실제 FK constraint | FK (1.0) |
| `_id` 패턴 + 코멘트 일치 | HIGH (0.9) |
| `_id` 패턴 | HIGH (0.8) |
| `_cd`/`_code` 패턴 | MEDIUM (0.6~0.7) |
| PK 컬럼명 직접 일치 | MEDIUM (0.55) |
| `_no` 패턴 | LOW (0.45~0.55) |

## Frontend 주요 컴포넌트

- `ErdStudioPage`: 프로젝트/연결 선택, 물리/논리 뷰 토글, 동기화, DBML/Mermaid export
- `TableNode`: 헤더(table_name + comment), 컬럼 목록(PK/FK 배지, 타입), `+N more` 접기
- `RelationEdge`: 신뢰도별 색상/선 스타일, 더블클릭 포커스 모드
- `FilterPanel`: 텍스트 검색, 도메인 체크박스, 신뢰도 토글
- `TableDetailDrawer`: 컬럼 상세 + 관계 목록 (reason/evidence)

## 커밋 컨벤션

```
feat(api): add mysql connection test endpoint
feat(worker): implement infer-relations endpoint
feat(front): add erd table node with field preview
fix(server): remove prisma dead code
```

## 보안 주의

- `.env` 및 운영 자격증명 Git 커밋 금지
- DB 비밀번호 현재 평문 저장 → 운영 전 `DB_CRED_ENCRYPTION_KEY` 기반 암호화 필요
- 로그에 비밀번호/토큰 출력 금지
