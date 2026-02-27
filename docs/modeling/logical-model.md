# ERDAI 논리 데이터 모델 (Logical Data Model)

## 1. 목적
이 문서는 ERDAI의 **논리 데이터 모델**을 정의한다.
업무 관점의 엔티티와 관계를 정리하고, 물리 모델/DDL의 기준 문서로 사용한다.

## 2. 범위
- 인증/권한
- 프로젝트
- DB 연결 설정
- 메타데이터 스냅샷
- ERD 관계 추론 결과
- ERD 내보내기 기록

## 3. 모델링 원칙
- 엔티티는 **업무 개념** 중심으로 정의한다.
- 자연키/대체키를 구분한다.
- 관계의 카디널리티(1:1, 1:N, N:M)를 명확히 기록한다.
- 논리 모델은 DBMS 세부 제약/타입과 분리한다.

## 4. 엔티티 목록(초안)
### 4.1 인증/권한
- User
- Role
- UserRole

### 4.2 프로젝트/연결
- Project
- ProjectMember
- DbConnection

### 4.3 메타/ERD
- MetadataSnapshot
- TableMeta
- ColumnMeta
- FkMeta
- InferredRelation
- ErdExportHistory

## 5. 핵심 엔티티 정의(요약)
### Project
- **설명**: ERD 분석의 최상위 단위
- **식별자**: project_id
- **주요 속성**: project_name, description, owner_id, status_cd, created_at, updated_at
- **관계**:
  - User 1:N Project
  - Project 1:N DbConnection
  - Project 1:N MetadataSnapshot

### User
- **설명**: ERDAI 사용자 계정
- **식별자**: user_id
- **주요 속성**: login_id, user_name, password_hash, email, status_cd
- **관계**:
  - User 1:N ProjectMember
  - User 1:N DbConnection

### DbConnection
- **설명**: 프로젝트별 DB 연결 설정
- **식별자**: connection_id
- **주요 속성**: project_id, connection_name, db_type, host, port, database/service_name/sid, username, encrypted_password
- **관계**:
  - Project 1:N DbConnection
  - User 1:N DbConnection

### MetadataSnapshot
- **설명**: 메타데이터 추출 결과 스냅샷
- **식별자**: snapshot_id
- **주요 속성**: project_id, connection_id, schema_name, extracted_at, table_count, column_count, fk_count
- **관계**:
  - DbConnection 1:N MetadataSnapshot
  - MetadataSnapshot 1:N TableMeta
  - MetadataSnapshot 1:N InferredRelation

### InferredRelation
- **설명**: FK 미존재 관계 추론 결과
- **식별자**: inferred_relation_id
- **주요 속성**: snapshot_id, source_table/column, target_table/column, confidence, score, cardinality, reason, evidence

## 6. 관계 요약(초안)
| 관계명 | From | To | Cardinality | 설명 |
|---|---|---|---|---|
| 사용자-프로젝트 | User | Project | 1:N | 프로젝트 소유자 |
| 프로젝트-연결 | Project | DbConnection | 1:N | 프로젝트별 연결 설정 |
| 연결-스냅샷 | DbConnection | MetadataSnapshot | 1:N | 메타 추출 이력 |
| 스냅샷-테이블 | MetadataSnapshot | TableMeta | 1:N | 테이블 메타 |
| 스냅샷-추론관계 | MetadataSnapshot | InferredRelation | 1:N | 추론 결과 |

## 7. TODO
- N:M 관계 해소 방식 확정
- 공통 코드/상태 코드 정의
- 감사 컬럼(생성/수정자) 정책 확정
- 논리-물리 매핑 최종 검토
