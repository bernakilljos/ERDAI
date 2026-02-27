# ERDAI — TODO

> 작업 완료 시 `[x]` 체크. 새 이슈는 해당 섹션에 추가.
> 마지막 업데이트: 2026-02

---

## 🔴 즉시 필요 (서버 기동 위해 필수)

- [x] **`server/.env` 생성**
  - `cp server/.env.example server/.env`
  - `WORKER_STUB=true` 확인 (Python Worker 없이 개발 가능)
  - 없으면 sync 시 Python Worker 실제 호출 → Worker 꺼진 경우 오류

- [x] **dead code 삭제 — `server/src/lib/prisma.ts`, `server/src/lib/store.ts`**
  - 두 파일 모두 import하는 곳 없음 (사용 안 됨)
  - `prisma.ts`는 `@prisma/client` 미설치로 `npm run build` 실패 원인
  - 삭제 후 `tsconfig.json` 확인

---

## 🟠 기능 보완 (운영 전 중요)

- [x] **Auth 미들웨어 — 보호된 라우트 적용**
  - 현재 `/projects`, `/connections`, `/erd`, `/metadata` 미인증 접근 가능
  - `src/lib/authMiddleware.ts` 생성 (쿠키에서 세션 검증)
  - 각 라우터에 `router.use(authMiddleware)` 추가
  - `/auth/*`는 제외

- [x] **Connection 저장 시 projectId UI 연동**
  - `ConnectionsPage`에서 저장 시 선택된 projectId를 body에 포함
  - `ConnectionForm`에 프로젝트 선택 드롭다운 추가 완료

- [ ] **DB 자격증명 암호화**
  - 현재 `server/data/projects/*.json`에 비밀번호 평문 저장
  - `DB_CRED_ENCRYPTION_KEY`(32바이트) 기반 AES-256 암호화
  - `jsonStore.createConnection()` 저장 시 암호화, 사용 시 복호화

---

## 🟡 UX/기능 추가

- [x] **ChangePasswordPage 구현**
  - 경로: `/change-password`
  - `mustChangePassword: true` 시 로그인 후 강제 리다이렉트
  - `POST /auth/change-password` 호출 후 `/connections`로 이동
  - `LoginPage.tsx`에서 `mustChangePassword` 체크 후 리다이렉트 추가

- [x] **프로젝트 생성 UI**
  - `ErdStudioPage` 헤더의 프로젝트 select 옆에 `+ 새 프로젝트` 버튼
  - 모달 폼: `projectName`, `description`
  - `projectApi.create()` 추가

- [x] **Connection 삭제**
  - `jsonStore.deleteConnection(id)` 추가
  - `DELETE /connections/:id` 라우트 추가
  - `ConnectionsPage` 연결 목록에 삭제 버튼

---

## 🔵 Python Worker 보완

- [ ] **도메인 자동 분류 (테이블 prefix)**
  - 현재 Worker가 `domain` 필드를 빈 문자열로 반환
  - `erdBuilder.ts`에서 `domain || 'ETC'` fallback 처리 중
  - `build-erd` 엔드포인트에서 prefix 기반 domain 분류 추가
    ```python
    # 예: mail_ → MAIL, qrtz_ → QRTZ, usr_ → USR
    ```
  - `agent/erd-engine.md` 기준 참고

- [ ] **MSSQL/Oracle 실제 연결 테스트**
  - MySQL만 실제 연결 검증됨
  - MSSQL: `pymssql` 연결 테스트
  - Oracle: `oracledb` thin mode 연결 테스트

---

## ⬜ 테스트

- [ ] **Node API vitest 테스트**
  - `vitest` + `supertest` 이미 설치됨 (`server/package.json`)
  - 테스트 파일: `src/__tests__/auth.test.ts`, `erd.test.ts`
  - 핵심 케이스: 로그인 성공/실패, ERD sync (stub 모드), 프로젝트 CRUD

- [ ] **Python Worker pytest 테스트**
  - `pytest` + `httpx` 이미 설치됨 (`requirements.txt`)
  - `tests/` 디렉터리 없음
  - 핵심: inference_service 추론 결과 검증, export_service DBML/Mermaid 형식

---

## ✅ 완료된 항목

- [x] Python Worker 7개 엔드포인트 (health/test/extract/infer/build-erd/export/dbml/mermaid)
- [x] Python 커넥터 3종 (MySQL/MSSQL/Oracle) + requirements.txt Python 3.14 호환
- [x] 관계 추론 엔진 (FK + _id/_cd/_no 패턴 + PK 직접 매칭)
- [x] DBML/Mermaid export 서비스
- [x] Node API 전체 라우터 (auth/connections/projects/metadata/erd)
- [x] jsonStore (파일 기반 영속화, Mutex 원자 쓰기)
- [x] bootstrap (admin 자동 생성, 기본 프로젝트 자동 생성)
- [x] erdBuilder (WorkerBuildErdResult → ErdGraph 변환)
- [x] Frontend API 클라이언트 4개 (authApi/connectionApi/projectApi/erdApi)
- [x] useErdGraph 훅 (load + sync)
- [x] ERD Studio 전체 (TableNode/RelationEdge/FilterPanel/TableDetailDrawer/ErdStudioPage)
- [x] LoginPage
- [x] ConnectionsPage
- [x] Vite 4.x 고정 (Node 16 + Vite 5 호환성 문제 해결)
- [x] tsx 3.x 고정 (Node 16 호환)
- [x] pydantic >= 2.10.0 (Python 3.14 cp314 wheel)
