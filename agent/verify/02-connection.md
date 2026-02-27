# DB 연결 설정 검증 체크리스트

> 전제: 로그인 완료 + `/connections` 페이지 진입 상태

---

## [ ] 1. 페이지 진입 확인

브라우저 `http://127.0.0.1:3000/connections`

→ DB 연결 폼이 보이는지 확인
→ 헤더에 "DB 연결" (활성) / "ERD 스튜디오" 탭이 보이는지 확인

---

## [ ] 2. 연결 테스트 (WORKER_STUB=true 모드)

`server/.env`에 `WORKER_STUB=true` 설정 후:

1. 폼에 임의 값 입력 (예: MySQL, host=localhost, port=3306, database=test, user=root, password=root)
2. "연결 테스트" 클릭
3. → stub 모드에서는 항상 성공 응답 반환

❌ 실패 시:
- F12 → Network → `POST /connections/test` 응답 확인
- 서버 로그에 `WORKER_STUB=false`로 되어 있으면 `server/.env` 확인

---

## [ ] 3. 연결 저장

1. 폼에 연결 정보 입력 후 "저장" 클릭
2. → 저장 성공 배너: "연결 저장 완료! ERD 스튜디오에서 동기화 →" 표시
3. → 하단 "저장된 연결" 목록에 항목이 추가되는지 확인

❌ 저장 실패 시:
- F12 → Network → `POST /connections` 응답 확인
- 200이면 화면 새로고침 후 목록 재확인

---

## [ ] 4. 저장된 연결 목록 확인

```bash
curl http://localhost:4000/connections -b /tmp/erdai-cookie.txt
```

→ 저장한 연결이 배열에 포함되어 있는지 확인

---

## [ ] 5. ERD 스튜디오로 이동

저장 성공 배너의 "ERD 스튜디오에서 동기화 →" 버튼 클릭

→ `/erd/{projectId}` 로 이동하는지 확인

또는 헤더의 "ERD 스튜디오" 탭 클릭으로도 이동 가능

---

## [ ] 6. 연결 삭제 확인

저장된 연결 항목의 "삭제" 버튼 클릭

→ 확인 대화상자 후 목록에서 제거되는지 확인

```bash
curl http://localhost:4000/connections -b /tmp/erdai-cookie.txt
# 해당 연결이 없어야 함
```

---

## 연결 저장 API

```
POST /connections
Body: { dbType, host, port, database, username, password, projectId? }
→ 201 { id, connectionName, dbType, host, port, ... }

DELETE /connections/:id
→ 204

POST /connections/test
→ 200 { ok: true } (stub) 또는 실제 DB 연결 결과
```
