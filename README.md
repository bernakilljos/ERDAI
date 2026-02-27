# ERDAI

## 개발 실행

### 1) 서버 (JSON 저장소)
```bash
cd server
npm install
npm run dev
```

### 2) 워커
```bash
cd worker
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

### 3) 프론트
```bash
cd frontend
npm install
npm run dev
```

## 저장소
- `data/` 폴더에 프로젝트별 JSON이 저장됩니다.
- 서버 재시작 후에도 기존 데이터가 유지됩니다.

## 테스트
```bash
cd server
npm test

cd worker
pytest -q
```
