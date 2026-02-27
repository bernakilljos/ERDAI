# ERDAI Frontend Skill (React)

## 참조 문서
- `agent/frontend.md`
- `agent/login.md`
- `agent/api.md`

## 기술 스택
- React + TypeScript, Vite 4.x (Node 16 호환 — Vite 5 사용 불가)
- @xyflow/react (React Flow v12)
- React Hook Form + Zod
- react-router-dom

## 현재 구현 상태

### ✅ 완료된 파일
| 파일 | 상태 |
|---|---|
| `src/api/authApi.ts` | ✅ |
| `src/api/connectionApi.ts` (test/save/list) | ✅ |
| `src/api/projectApi.ts` (list/get/reset) | ✅ |
| `src/api/erdApi.ts` (get/sync/exportDbml/exportMermaid) | ✅ |
| `src/hooks/useErdGraph.ts` | ✅ |
| `src/pages/LoginPage.tsx` | ✅ |
| `src/pages/ConnectionsPage.tsx` | ✅ |
| `src/pages/ErdStudioPage.tsx` | ✅ |
| `src/components/erd/TableNode.tsx` | ✅ |
| `src/components/erd/RelationEdge.tsx` | ✅ |
| `src/components/erd/FilterPanel.tsx` | ✅ |
| `src/components/erd/TableDetailDrawer.tsx` | ✅ |
| `src/styles/erd.css` | ✅ |

### ❌ 남은 작업
1. **ChangePasswordPage** — 최초 로그인 후 강제 비밀번호 변경 (`mustChangePassword` 체크)
2. **ConnectionsPage projectId 연동** — 저장 시 선택된 projectId 포함
3. **프로젝트 생성 UI** — ErdStudioPage 헤더 또는 별도 페이지
4. **useAuth 훅** — 로그인 상태 전역 관리, 미인증 시 /login 리다이렉트

## 화면 목록
| 화면 | 경로 | 상태 |
|---|---|---|
| 로그인 | `/login` | ✅ |
| 비밀번호 변경 | `/change-password` | ❌ 미구현 |
| DB 연결 설정 | `/connections` | ✅ |
| ERD Studio | `/erd/:projectId` | ✅ |

## ErdStudioPage 구조
```
<ErdStudioPage>
  ├── 헤더: 프로젝트 select, 연결 select, 물리/논리 토글, DBML/Mermaid export, 프로젝트 초기화, 동기화
  ├── 좌측: <FilterPanel> (검색, 도메인 체크박스, 신뢰도 토글)
  ├── 중앙: <ReactFlow> (TableNode, RelationEdge, MiniMap, Controls, Background)
  └── 우측: <TableDetailDrawer> (컬럼 상세 + 관계 목록)
```

## TableNode 표시 규칙
- 헤더: 도메인 배지 + table_name (굵게) + table_comment (서브)
- 컬럼: PK/FK/NN 배지, data_type, column_comment
- 기본 8행, `+N more` 버튼으로 펼침
- 더블클릭: fitView(이웃 노드), 나머지 dim (opacity 0.15)

## RelationEdge 색상
- FK: `#37474f` (진한 회색)
- HIGH: `#1565c0` (파랑)
- MEDIUM: `#e65100` (주황)
- LOW: `#9e9e9e` (회색) — 필터 OFF가 기본

## 주의사항
- Vite 5는 Node 16에서 `crypto.getRandomValues` 오류 → **Vite 4.x 고정**
- API BASE URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:4000'`
- 모든 fetch에 `credentials: 'include'` 필수 (쿠키 세션)
