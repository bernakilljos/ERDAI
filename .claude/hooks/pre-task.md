# Pre-Task Hook — 작업 시작 전 체크리스트

## 필수 확인
1. `TODO.md` 열고 오늘 작업 항목 확인
2. 관련 스킬 문서 확인:
   - 백엔드: `.claude/skills/erdai-backend/skill.md`
   - 프론트: `.claude/skills/erdai-frontend/skill.md`
   - Worker: `.claude/skills/erdai-db-erd/skill.md`
   - API 계약: `.claude/skills/erdai-api-design/skill.md`
3. 민감정보 하드코딩 계획 없음 확인
4. 작업 완료 기준(DoD) 명확히 정의

## 환경 확인
```bash
# server/.env 존재 여부
ls server/.env

# Node API 기동
cd server && npm run dev

# Frontend 기동
cd frontend && npm run dev

# Python Worker 기동 (WORKER_STUB=false 시)
cd worker && python -m uvicorn app.main:app --port 8000 --reload
```

## 추천 프롬프트 패턴
- "TODO.md의 [항목명] 구현해줘. `.claude/skills/erdai-backend/skill.md` 기준으로"
- "오늘 범위는 auth 미들웨어만. 기존 라우터 건드리지 말고 미들웨어 추가만"
