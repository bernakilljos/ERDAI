# 네이밍 규칙

## 1. 테이블
- snake_case
- prefix로 도메인 구분 (예: prj_project)

## 2. 컬럼
- snake_case
- PK: <table>_id 또는 id
- FK: <ref_table>_id 권장

## 3. 제약/인덱스
- PK: pk_<table>
- UK: uk_<table>_<nn>
- FK: fk_<child>_<parent>_<nn>
- IDX: idx_<table>_<nn>

## 4. 공통 컬럼
- created_at, created_by, updated_at, updated_by
