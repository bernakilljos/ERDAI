from typing import Literal, Optional
from pydantic import BaseModel, model_validator


class DbConnectionRequest(BaseModel):
    """Node API <-> Worker 공통 연결 요청 모델 (snake_case: Python 컨벤션)"""
    db_type:      Literal['mysql', 'mssql', 'oracle']
    host:         str
    port:         int
    database:     Optional[str] = None   # mysql / mssql
    service_name: Optional[str] = None   # oracle
    sid:          Optional[str] = None   # oracle
    username:     str
    password:     str                    # 로그에 노출하지 않음

    @model_validator(mode='after')
    def check_db_specific_fields(self) -> 'DbConnectionRequest':
        if self.db_type in ('mysql', 'mssql') and not self.database:
            raise ValueError(f'{self.db_type}는 database 필드가 필요합니다.')
        if self.db_type == 'oracle' and not self.service_name and not self.sid:
            raise ValueError('oracle은 service_name 또는 sid 중 하나가 필요합니다.')
        return self


class TestConnectionRequest(DbConnectionRequest):
    pass


class ExtractMetadataRequest(DbConnectionRequest):
    pass


class TestConnectionResponse(BaseModel):
    success:    bool
    message:    str
    db_version: Optional[str] = None
    error_code: Optional[str] = None
