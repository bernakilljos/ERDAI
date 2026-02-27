# ERDAI 물리 데이터 모델 (Physical Data Model)

## 1. 목적
논리 모델을 **MySQL 8.x 기준 물리 스키마**로 변환한 문서다.
DDL 생성 및 실제 DB 구현의 기준으로 사용한다.

## 2. 대상 DBMS
- 기본: MySQL 8.x
- 확장: MSSQL, Oracle (추후 반영)

## 3. 공통 규칙
- 테이블/컬럼은 snake_case
- PK/FK/UK/IDX 명명 규칙 준수
- table_comment/column_comment 필수
- 민감정보는 암호화 저장(암호키 별도 관리)

## 4. 공통 컬럼
- created_at datetime(3) not null
- created_by varchar(50) not null
- updated_at datetime(3) null
- updated_by varchar(50) null

## 5. 테이블 정의(요약)
### 5.1 prj_project
- PK: project_id
- FK: owner_id -> auth_user.user_id

| column | type | NN | PK | FK | default | comment |
|---|---|:--:|:--:|:--:|---|---|
| project_id | bigint | Y | Y |  |  | 프로젝트 PK |
| project_name | varchar(100) | Y |  |  |  | 프로젝트명 |
| description | text | N |  |  |  | 설명 |
| owner_id | bigint | Y |  | Y |  | 소유자 |
| status_cd | varchar(20) | Y |  |  | ACTIVE | 상태 코드 |
| created_at | datetime(3) | Y |  |  | current_timestamp(3) | 생성일 |
| created_by | varchar(50) | Y |  |  | system | 생성자 |
| updated_at | datetime(3) | N |  |  |  | 수정일 |
| updated_by | varchar(50) | N |  |  |  | 수정자 |

### 5.2 auth_user
- PK: user_id
- UK: login_id, email

| column | type | NN | PK | UK | default | comment |
|---|---|:--:|:--:|:--:|---|---|
| user_id | bigint | Y | Y |  |  | 사용자 PK |
| login_id | varchar(50) | Y |  | Y |  | 로그인 ID |
| user_name | varchar(100) | Y |  |  |  | 사용자명 |
| password_hash | varchar(255) | Y |  |  |  | 비밀번호 해시 |
| email | varchar(255) | N |  | Y |  | 이메일 |
| status_cd | varchar(20) | Y |  |  | ACTIVE | 상태 |
| created_at | datetime(3) | Y |  |  | current_timestamp(3) | 생성일 |
| created_by | varchar(50) | Y |  |  | system | 생성자 |
| updated_at | datetime(3) | N |  |  |  | 수정일 |
| updated_by | varchar(50) | N |  |  |  | 수정자 |

### 5.3 cfg_db_connection
- PK: connection_id
- FK: project_id -> prj_project.project_id

| column | type | NN | PK | FK | default | comment |
|---|---|:--:|:--:|:--:|---|---|
| connection_id | bigint | Y | Y |  |  | 연결 PK |
| project_id | bigint | Y |  | Y |  | 프로젝트 PK |
| connection_name | varchar(100) | Y |  |  |  | 연결명 |
| db_type | varchar(20) | Y |  |  |  | mysql/mssql/oracle |
| host | varchar(255) | Y |  |  |  | 호스트 |
| port | int | Y |  |  |  | 포트 |
| database_name | varchar(100) | N |  |  |  | DB명 |
| service_name | varchar(100) | N |  |  |  | Oracle Service |
| sid | varchar(100) | N |  |  |  | Oracle SID |
| username | varchar(100) | Y |  |  |  | 계정 |
| password_enc | text | Y |  |  |  | 암호화 비밀번호 |
| last_test_status_cd | varchar(20) | N |  |  |  | 테스트 상태 |
| last_tested_at | datetime(3) | N |  |  |  | 테스트 일시 |

### 5.4 md_snapshot
- PK: snapshot_id
- FK: project_id, connection_id

### 5.5 md_table / md_column / md_fk
- 스냅샷별 테이블/컬럼/FK 메타

### 5.6 erd_inferred_relation
- 추론된 관계 저장(신뢰도/근거 포함)

### 5.7 erd_export_history
- DBML/Mermaid/HTML 내보내기 이력

## 6. 인덱스/제약 명명 규칙
- UK: uk_<table>_<nn>
- FK: fk_<child>_<parent>_<nn>
- IDX: idx_<table>_<nn>

## 7. DBMS 차이 메모
- MySQL: datetime(3), AUTO_INCREMENT, table/column comment 지원
- MSSQL: datetime2(3), IDENTITY, extended property 사용
- Oracle: timestamp(3), sequence/identity, COMMENT ON TABLE/COLUMN
