"""
DB 커넥터 추상 인터페이스
MSSQL / Oracle 등은 이 클래스를 상속해 구현한다.

필수 구현:
  1. connection()      -> 연결 컨텍스트 매니저
  2. get_db_version()  -> DB 버전 문자열
  3. test()            -> 연결 테스트 결과 dict
  4. extract_columns_raw() -> 컬럼 메타 raw row
  5. extract_fks_raw()     -> FK 메타 raw row

세부 변환은 metadata_service가 처리한다.
"""
from abc import ABC, abstractmethod
from contextlib import contextmanager
from typing import Any, Generator


class ConnectorError(Exception):
    """커넥터 에러: 라우터에서 HTTP 응답으로 변환"""
    def __init__(self, message: str, error_code: str = 'UNKNOWN'):
        self.message    = message
        self.error_code = error_code
        super().__init__(message)


class UnsupportedDbTypeError(Exception):
    """factory에서 지원하지 않는 db_type 요청"""
    def __init__(self, db_type: str):
        self.db_type = db_type
        super().__init__(f"Unsupported db_type: {db_type}")


class BaseConnector(ABC):

    @abstractmethod
    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        """DB 연결 컨텍스트 (정상/예외 모두 close 보장)"""
        ...

    @abstractmethod
    def get_db_version(self, conn: Any) -> str:
        """연결된 DB 버전 문자열 반환"""
        ...

    @abstractmethod
    def test(self) -> dict:
        """
        연결 테스트
        반환: {'success': bool, 'message': str, 'db_version': str | None,
              'error_code': str | None}
        """
        ...

    @abstractmethod
    def extract_columns_raw(self, conn: Any, schema: str) -> list[dict]:
        """information_schema 컬럼 raw row 목록"""
        ...

    @abstractmethod
    def extract_fks_raw(self, conn: Any, schema: str) -> list[dict]:
        """FK raw row 목록"""
        ...
