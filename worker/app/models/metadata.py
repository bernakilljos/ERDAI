"""
스키마 메타데이터 응답 모델 (agent/erd-engine.md 기준 2단계: 스키마 모델)

이 구조는 이후 관계 추론, ERD 빌드, DBML/Mermaid export의 공통 입력으로 사용된다.
"""
from typing import Optional
from pydantic import BaseModel, Field


class ColumnMeta(BaseModel):
    col_no:        int
    name:          str
    data_type:     str
    nullable:      bool
    key_type:      str            # 'PRI' | 'MUL' | 'UNI' | ''
    is_pk:         bool
    default_value: Optional[str] = None
    extra:         str = ''
    comment:       str = ''


class FkMeta(BaseModel):
    """실제 FK 정보 (DDL 기반)"""
    column_name:      str
    constraint_name:  str
    ref_table:        str
    ref_column:       str
    update_rule:      str = 'NO ACTION'
    delete_rule:      str = 'NO ACTION'


class TableMeta(BaseModel):
    name:       str
    comment:    str = ''
    domain:     str = ''          # 테이블 prefix 기반 도메인
    columns:    list[ColumnMeta] = Field(default_factory=list)
    pk_columns: list[str]        = Field(default_factory=list)
    fk_refs:    list[FkMeta]     = Field(default_factory=list)


class SchemaMetadata(BaseModel):
    """
    /worker/extract-metadata 최종 응답 모델.
    Node API가 그대로 전달하거나 저장한다.
    """
    schema_name:  str
    table_count:  int
    column_count: int
    fk_count:     int
    tables:       list[TableMeta]
    extracted_at: str             # ISO 8601 UTC
