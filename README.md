# ERDAI Logical/Physical Modeling Pack

이 패키지는 ERDAI 프로젝트에서 **논리 모델 + 물리 모델 + ERD 문서화**를 시작하기 위한 템플릿 모음이다.

## 포함 내용
- docs/modeling/*.md (논리/물리/네이밍/도메인사전)
- docs/erd/*.md (논리ERD/물리ERD)
- docs/prompts/*.md (Claude Code 지시문 복붙용)
- .claude/skills/* (논리/물리 모델링 스킬)
- .claude/hooks/* (문서 검증/간단 시크릿 스캔)
- .claude/settings.json (기본 훅 설정)

## 사용 순서
1. 패키지 압축 해제
2. 프로젝트 루트에 파일 병합
3. Claude Code에서 `/memory`, `/hooks` 확인
4. `docs/prompts/*.md` 지시문으로 작업 시작
