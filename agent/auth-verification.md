# 인증(Auth) 검증 체크리스트

> 이 문서는 "이렇게 검증하라"는 실행 지시 체크리스트입니다.
> 실행 전: 서버(`npm run dev`)와 프론트(`npm run dev`)가 켜져 있어야 합니다.

---

## 핵심 아키텍처

```
브라우저(127.0.0.1:3000) → Vite 프록시 → localhost:4000 (Node API)
```

- **Vite 프록시 경유**: `/auth`, `/connections`, `/projects`, `/metadata`, `/erd`, `/health`
- 쿠키 도메인 = `127.0.0.1` (브라우저 origin)
- **직접 연결 금지**: `http://localhost:4000` 직접 호출 시 SameSite 쿠키 문제 발생

---

## [ ] 1. 서버 기동 확인

```bash
curl http://localhost:4000/health
```

→ `{"ok":true,"env":"local"}` 나오는지 확인

❌ 실패 시: `cd server && npm run dev` 실행

---

## [ ] 2. 로그인 검증

브라우저에서 `http://127.0.0.1:3000` 접속

1. `admin` / `admin` 입력 후 로그인
2. `/connections` 페이지로 이동하는지 확인

❌ `/login`으로 돌아오면:
- F12 → Network 탭 → `/auth/login` 응답 확인
  - 200인데 튕기면: 쿠키 domain 문제 → `http://127.0.0.1:3000`으로 접속했는지 확인 (localhost 금지)
  - 401이면: `server/data/users.json` 비밀번호 확인

---

## [ ] 3. 쿠키 발급 확인

F12 → Application → Cookies → `http://127.0.0.1:3000`

| 항목 | 기대값 |
|---|---|
| Name | `erdai_session` |
| Domain | `127.0.0.1` |
| HttpOnly | ✓ |
| SameSite | `Lax` |

❌ Domain이 `localhost`이면: `http://127.0.0.1:3000`이 아닌 다른 URL로 접속 중

---

## [ ] 4. 세션 유지 확인

```bash
# 쿠키 파일로 로그인 후 세션 확인
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin","password":"admin"}' \
  -c /tmp/erdai-cookie.txt

curl http://localhost:4000/auth/me -b /tmp/erdai-cookie.txt
```

→ `/auth/me` 응답: `{"id":"u-...","loginId":"admin","role":"ADMIN",...}`

❌ 401이면: 세션 Map 초기화됨 (서버 재시작) → 브라우저에서 다시 로그인

---

## [ ] 5. 보호 라우트 접근 확인

```bash
curl http://localhost:4000/connections -b /tmp/erdai-cookie.txt
curl http://localhost:4000/projects -b /tmp/erdai-cookie.txt
```

→ 각각 `[]` 또는 `[{...}]` (배열)

---

## [ ] 6. mustChangePassword 확인

로그인 후 비밀번호 변경 화면이 강제로 뜨는지 확인

→ 뜨면 정상 (초기 admin 계정 설정)
→ 뜨지 않아야 하는데 뜨면: `server/data/users.json`에서 `mustChangePassword: false`로 수정

---

## 알려진 버그 이력

### Bug 1: SameSite 쿠키 문제 (수정됨 2026-02-25)
**증상:** 로그인해도 `/login`으로 돌아옴
**원인:** `fetchClient.ts`가 `http://localhost:4000`으로 직접 호출
**수정:** BASE URL 제거, 상대 경로 사용 + vite.config.ts 프록시 보완

### Bug 2: Race Condition (수정됨 2026-02-25)
**증상:** 로그인 후 `/connections`로 이동했다가 다시 `/login`으로 튕김
**원인:** `/auth/me` pending 중 401 응답 → `setUser(null)` 호출
**수정:** `AuthContext.tsx` catch에서 `setUser(null)` 제거

### Bug 3: 서버 재시작 시 세션 초기화 (구조적 한계)
**증상:** tsx watch 파일 저장 시 서버 재시작 → 세션 소멸
**현재 대응:** fetchClient 401 → 자동 /login 리다이렉트
**근본 해결:** 세션 파일 영속화 (TODO)

---

## 빠른 리셋

```bash
# 브라우저 쿠키 삭제: F12 → Application → Cookies → Clear All
curl http://localhost:4000/health
# 이후 127.0.0.1:3000 에서 재로그인
```
