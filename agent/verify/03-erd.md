# ERD 동기화 / 논리·물리 뷰 검증 체크리스트

> 전제: 로그인 완료 + DB 연결 1개 이상 저장됨

---

## [ ] 1. ERD 스튜디오 진입

브라우저 `http://127.0.0.1:3000/erd/{projectId}` 또는 ConnectionsPage 헤더 "ERD 스튜디오" 탭 클릭

→ 헤더에 프로젝트 select, 연결 select, 물리/논리 토글, 동기화 버튼이 보이는지 확인
→ 헤더에 "DB 연결" 탭이 보이는지 확인 (클릭 시 /connections 이동)

---

## [ ] 2. 연결 없을 때 안내 확인

프로젝트는 있으나 해당 프로젝트에 연결이 없는 경우:

→ 연결 select 위치에 "연결 없음 — 연결 추가" 링크가 표시되는지 확인
→ "연결 추가" 클릭 시 `/connections`로 이동하는지 확인

---

## [ ] 3. ERD 동기화 (WORKER_STUB=true)

1. 연결 select에서 연결 선택
2. "동기화" 버튼 클릭
3. → "동기화 중..." 표시 후 완료
4. → 캔버스에 테이블 노드가 표시되는지 확인 (stub 모드: 샘플 테이블 2~3개)

```bash
# API 직접 확인
curl -X POST http://localhost:4000/erd/{projectId}/sync \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"{connectionId}"}' \
  -b /tmp/erdai-cookie.txt
```

→ `{"ok":true,"graph":{...}}` 반환 확인

---

## [ ] 4. 물리 뷰 확인

헤더의 "물리" 버튼이 활성(파란색)인지 확인

→ 테이블 노드에 **물리 컬럼명** (영문, 스네이크케이스)이 표시되는지 확인
→ 예: `USER_ID`, `CREATED_AT`, `ORDER_NO`

---

## [ ] 5. 논리 뷰 확인

헤더의 "논리" 버튼 클릭

→ 테이블 노드에 **논리 컬럼명** (한글 comment)이 표시되는지 확인
→ 예: `사용자ID`, `생성일시`, `주문번호`
→ comment가 없는 컬럼은 물리명 그대로 표시

---

## [ ] 6. 관계선 확인

→ 테이블 간 관계선이 표시되는지 확인
→ 신뢰도별 색상:
  - FK (회색): 실제 FK constraint
  - HIGH (파란색): `_id` 패턴 + comment 일치
  - MEDIUM (주황색): `_cd`, `_code` 패턴
  - LOW (회색): `_no` 패턴

---

## [ ] 7. 필터 패널 동작 확인

왼쪽 필터 패널에서:
1. 텍스트 검색: 테이블명/comment 입력 → 매칭 노드만 표시
2. 도메인 체크박스 해제 → 해당 도메인 노드 숨김
3. 신뢰도 토글 해제 → 해당 신뢰도 관계선 숨김

---

## [ ] 8. 테이블 상세 드로어 확인

캔버스에서 테이블 노드 클릭

→ 오른쪽에 드로어가 열리는지 확인
→ 컬럼 목록(타입, PK/FK/NN 배지, comment) 표시
→ 관계 목록(sourceTable → targetTable, reason, evidence) 표시

---

## [ ] 9. 포커스 모드 확인

테이블 노드 **더블클릭**

→ 해당 노드와 연결된 노드만 강조, 나머지 흐릿하게 표시
→ "더블클릭으로 포커스 해제" 힌트 표시
→ 빈 공간 클릭 또는 같은 노드 재더블클릭으로 포커스 해제

---

## [ ] 10. Export 확인

헤더의 "DBML" 버튼 클릭

→ `.dbml` 파일 다운로드 시작
→ 파일 내용에 `Table` 키워드로 테이블 정의 포함 확인

"Mermaid" 버튼 클릭

→ `.mmd` 파일 다운로드
→ 파일 내용에 `erDiagram` 포함 확인

---

## ERD 관련 API

```
GET  /erd/:projectId                    → 현재 저장된 그래프
POST /erd/:projectId/sync               → 재동기화 { connectionId? }
GET  /erd/:projectId/export/dbml        → DBML 텍스트
GET  /erd/:projectId/export/mermaid     → Mermaid 텍스트
```
