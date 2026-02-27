# ERDAI Orchestrator Skill

## 목적
전체 구현 흐름을 조율하고 레이어 간 정합성을 유지한다.

## 현재 구현 상태 (2025-02)

### ✅ 완료된 레이어
| 레이어 | 상태 |
|---|---|
| Python Worker (전체 7개 엔드포인트) | ✅ |
| Python 커넥터 3종 (MySQL/MSSQL/Oracle) | ✅ |
| 관계 추론 엔진 (inference_service.py) | ✅ |
| DBML/Mermaid export (export_service.py) | ✅ |
| Node API 전체 (auth/connections/projects/metadata/erd) | ✅ |
| jsonStore (파일 기반 JSON 영속화) | ✅ |
| bootstrap (admin 자동 생성) | ✅ |
| erdBuilder (Worker응답 → ErdGraph 변환) | ✅ |
| Frontend API 클라이언트 4개 | ✅ |
| useErdGraph 훅 | ✅ |
| ERD Studio (전체 컴포넌트) | ✅ |
| LoginPage | ✅ |
| ConnectionsPage | ✅ |

### ❌ 남은 작업 (우선순위 순)
자세한 내용: `TODO.md` 참조

1. `server/.env` 생성 (WORKER_STUB=true 설정)
2. `prisma.ts` / `store.ts` dead code 삭제
3. Auth 미들웨어 (보호된 라우트)
4. Connection 저장 시 projectId UI
5. 프로젝트 생성 UI
6. DB 자격증명 암호화
7. 테스트 파일

## 구현 원칙
- 한 번에 한 레이어 중심으로 작업
- 작업 전 `TODO.md` + 관련 `agent/*.md` 확인
- 민감정보 하드코딩 금지
- 완료 후 `TODO.md` 업데이트

## 논리 vs 물리 ERD
- **물리 ERD**: 기본 뷰. table/column/PK/FK/type 표시.
- **논리 ERD**: 토글 뷰. 업무 엔티티 중심, DBMS 타입 미표시.
- 동일 ErdStudioPage 내 `view` 상태로 전환.

## 다음 마일스톤: 실제 DB 연결 End-to-End 테스트
1. `server/.env`에 `WORKER_STUB=false` 설정
2. Python Worker 기동
3. ConnectionsPage에서 MySQL 연결 저장
4. ErdStudioPage에서 동기화 → ERD 확인
