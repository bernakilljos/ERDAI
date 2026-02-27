# 백엔드 설계 (Node + Python)

## 역할 분리
### Node API
- 인증/세션
- 프로젝트/연결 관리
- Worker 호출 및 에러 매핑

### Python Worker
- DB 연결 테스트
- 메타데이터 추출
- 관계 추론
- ERD/Export 빌드

## 구조 예시
```
server/
  src/
    modules/
      auth/
      connections/
      projects/
      metadata/
      erd/
```

```
worker/
  app/
    services/
      connectors/
        mysql_connector.py
      metadata_service.py
      inference_service.py
      export_service.py
```

## 관계 추론 규칙(기본)
1. 실제 FK 우선
2. 컬럼명 규칙(_id, _cd/_code, _no)
3. 코멘트 기반 보정
