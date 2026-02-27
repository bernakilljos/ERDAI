# ERDAI DB/ERD Skill (Python Worker)

## 참조 문서
- `agent/db-connection.md`
- `agent/erd-engine.md`
- `agent/backend.md`

## 현재 구현 상태

### ✅ 완료
| 항목 | 파일 |
|---|---|
| FastAPI 앱 구조 | `app/main.py` |
| 전체 7개 엔드포인트 | `app/routers/worker.py` |
| MySQL 커넥터 | `app/services/connectors/mysql_connector.py` |
| MSSQL 커넥터 (pymssql) | `app/services/connectors/mssql_connector.py` |
| Oracle 커넥터 (oracledb) | `app/services/connectors/oracle_connector.py` |
| 커넥터 팩토리 | `app/services/connectors/factory.py` |
| 메타데이터 추출 서비스 | `app/services/metadata_service.py` |
| 관계 추론 서비스 | `app/services/inference_service.py` |
| DBML/Mermaid export | `app/services/export_service.py` |
| Pydantic 모델 | `app/models/connection.py`, `metadata.py`, `erd.py` |
| requirements.txt | pymysql/pymssql/oracledb/pydantic>=2.10.0 |

### 엔드포인트 목록
```
GET  /worker/health
POST /worker/test-connection       # TestConnectionRequest → TestConnectionResponse
POST /worker/extract-metadata      # ExtractMetadataRequest → SchemaMetadata
POST /worker/infer-relations       # InferRelationsRequest → list[InferredRelation]
POST /worker/build-erd             # BuildErdRequest → ErdGraph
POST /worker/export/dbml           # BuildErdRequest → PlainText
POST /worker/export/mermaid        # BuildErdRequest → PlainText
```

### 관계 추론 로직 (inference_service.py)
1. **실제 FK** — fk_refs에서 confidence=FK (score=1.0)
2. **`_id` 패턴** — 테이블명 매칭 시 HIGH (0.8~0.9), 코멘트 일치 +0.1
3. **`_cd`/`_code` 패턴** — MEDIUM (0.6~0.7)
4. **`_no` 패턴** — LOW (0.45~0.55)
5. **PK 컬럼명 직접 일치** — MEDIUM (0.55)

### ❌ 남은 작업
1. **MSSQL/Oracle 실제 연결 테스트** — MySQL만 검증됨
2. **도메인 자동 분류** — 테이블 prefix 기반 (예: `mail_` → MAIL)
   - 현재 Worker에서 domain 필드 반환하지 않음 (`erdBuilder`에서 'ETC' 기본값)
   - `inference_service.py` 또는 `build-erd` 엔드포인트에서 prefix 분류 추가 필요
3. **대형 스키마 성능** — 200+ 테이블 처리 시 타임아웃 테스트
4. **pytest 테스트** — `tests/` 디렉터리 없음

## 기동 방법
```bash
cd worker
python -m uvicorn app.main:app --port 8000 --reload
# python main.py 로 실행 금지 (모듈 경로 문제)
```

## Python 버전 주의
- Python 3.14 이상: pydantic>=2.10.0 필수 (cp314 wheel 있음)
- pydantic 2.9.x: Rust build 필요 → 설치 실패
