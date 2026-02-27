# Pre-Commit Hook

## 체크 항목
1. `.env`, 비밀번호, 토큰 커밋 제외 확인
2. 비밀번호/토큰 로그 출력 없는지 확인
3. `docs/api.md`와 실제 API 경로 일치 확인
4. 테스트/실행 확인
5. 커밋 메시지 기능 단위 확인

## 예시 커밋 메시지
- `feat(api): add mysql connection test endpoint`
- `feat(worker): extract mysql metadata with comments`
- `feat(front): add erd table node with field preview`
