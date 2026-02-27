"""
메타데이터 추출 서비스 (agent/erd-engine.md 1~3단계)

1. 메타 수집: connector.extract_columns_raw / extract_fks_raw
2. 스키마 변환: raw dict -> Pydantic 모델
3. FK 반영: FkMeta -> TableMeta.fk_refs
"""
import logging
from datetime import datetime, timezone

from app.models.metadata import ColumnMeta, FkMeta, SchemaMetadata, TableMeta
from app.services.connectors.base import BaseConnector

logger = logging.getLogger(__name__)

# 도메인 추론 (테이블 prefix 기반)

def _infer_domain(table_name: str) -> str:
    """
    테이블명 prefix(첫 번째 '_' 기준)를 대문자로 변환해 도메인 분류.
    예: r_indicatorinfo -> R, st_tr_sales -> ST_TR
    """
    parts = table_name.lower().split('_')
    # 복합 prefix (st_tr_ 등) 처리
    if len(parts) >= 3 and len(parts[0]) <= 4 and len(parts[1]) <= 4:
        return f'{parts[0]}_{parts[1]}'.upper()
    if len(parts) >= 2:
        return parts[0].upper()
    return 'ETC'


def extract_metadata(connector: BaseConnector, schema: str) -> SchemaMetadata:
    """
    connector를 통해 raw SQL 결과를 수집한 뒤 SchemaMetadata로 변환한다.

    - connection() 컨텍스트 매니저가 open/close 보장
    - 비밀번호는 connector 내부에만 존재
    """
    logger.info('extract_metadata: schema=%s', schema)

    with connector.connection() as conn:
        raw_cols = connector.extract_columns_raw(conn, schema)
        raw_fks  = connector.extract_fks_raw(conn, schema)

    logger.info('raw rows: columns=%d, fks=%d', len(raw_cols), len(raw_fks))

    # 컬럼/테이블 빌드
    tables: dict[str, TableMeta] = {}

    for row in raw_cols:
        tname = row['table_name']

        if tname not in tables:
            tables[tname] = TableMeta(
                name=tname,
                comment=row.get('table_comment') or '',
                domain=_infer_domain(tname),
            )

        col = ColumnMeta(
            col_no=row['col_no'],
            name=row['column_name'],
            data_type=row['data_type'],
            nullable=(row['nullable_yn'] == 'Y'),
            key_type=row.get('key_type') or '',
            is_pk=(row['pk_yn'] == 'Y'),
            default_value=row.get('default_value'),
            extra=row.get('extra_info') or '',
            comment=row.get('column_comment') or '',
        )
        tables[tname].columns.append(col)
        if col.is_pk:
            tables[tname].pk_columns.append(col.name)

    # FK 반영
    for row in raw_fks:
        tname = row['table_name']
        if tname not in tables:
            logger.warning('fk refers unknown table: %s', tname)
            continue

        fk = FkMeta(
            column_name=row['column_name'],
            constraint_name=row['constraint_name'],
            ref_table=row['referenced_table_name'],
            ref_column=row['referenced_column_name'],
            update_rule=row.get('update_rule') or 'NO ACTION',
            delete_rule=row.get('delete_rule') or 'NO ACTION',
        )
        tables[tname].fk_refs.append(fk)

    # 집계
    table_list   = sorted(tables.values(), key=lambda t: t.name)
    column_count = sum(len(t.columns) for t in table_list)

    result = SchemaMetadata(
        schema_name=schema,
        table_count=len(table_list),
        column_count=column_count,
        fk_count=len(raw_fks),
        tables=table_list,
        extracted_at=datetime.now(timezone.utc).isoformat(),
    )

    logger.info(
        'extract_metadata done: tables=%d columns=%d fks=%d',
        result.table_count, result.column_count, result.fk_count,
    )
    return result
