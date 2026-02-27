# API 설계 (Node API + Python Worker)

## 아키텍처
- **Node API**: 인증/권한, 프로젝트, 연결 관리, Worker 호출
- **Python Worker**: 메타 추출, 관계 추론, ERD 빌드/Export

## 인증 API
### POST /auth/login
```json
{ "loginId": "admin", "password": "******" }
```

### GET /auth/me
현재 로그인 사용자 정보

### POST /auth/logout
세션 종료

### POST /auth/change-password
```json
{ "currentPassword": "admin", "newPassword": "newpass123" }
```

## 프로젝트 API
### GET /projects
### POST /projects
```json
{ "projectName": "rms_dev 분석", "description": "..." }
```
### GET /projects/:projectId
### PUT /projects/:projectId

## 연결 API
### POST /connections/test
```json
{ "dbType": "mysql", "host": "127.0.0.1", "port": 13306, "database": "rms_dev", "username": "rms_test", "password": "test1234" }
```

### POST /connections
```json
{ "projectId": "1", "connectionName": "rms_dev", "dbType": "mysql", "host": "127.0.0.1", "port": 13306, "database": "rms_dev", "username": "rms_test", "password": "test1234" }
```

### GET /connections

## 메타/ERD API
### POST /metadata/extract
```json
{ "connectionId": "1" }
```

### POST /erd/:projectId/sync
```json
{ "connectionId": "1" }
```

### GET /erd/:projectId
### GET /erd/:projectId/export/dbml
### GET /erd/:projectId/export/mermaid

## Worker API
- POST /worker/test-connection
- POST /worker/extract-metadata
- POST /worker/infer-relations
- POST /worker/build-erd
- POST /worker/export/dbml
- POST /worker/export/mermaid
- GET  /worker/health
