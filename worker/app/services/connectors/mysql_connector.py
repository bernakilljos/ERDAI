"""
MySQL 커넥터 (pymysql 기반)

agent/db-connection.md의 SQL 쿼리를 사용한다.
"""
import logging
from contextlib import contextmanager
from typing import Any, Generator

import pymysql
import pymysql.cursors
import pymysql.err

from .base import BaseConnector, ConnectorError

logger = logging.getLogger(__name__)

# SQL (agent/db-connection.md)

_SQL_COLUMNS = """
SELECT
    c.table_schema  AS schema_name,
    c.table_name    AS table_name,
    t.table_comment AS table_comment,
    c.ordinal_position AS col_no,
    c.column_name   AS column_name,
    c.column_type   AS data_type,
    CASE WHEN c.is_nullable = 'NO' THEN 'N' ELSE 'Y' END AS nullable_yn,
    c.column_key    AS key_type,
    CASE WHEN c.column_key = 'PRI' THEN 'Y' ELSE 'N' END AS pk_yn,
    c.column_default  AS default_value,
    c.extra           AS extra_info,
    c.column_comment  AS column_comment
FROM information_schema.columns c
JOIN information_schema.tables t
  ON  t.table_schema = c.table_schema
 AND  t.table_name   = c.table_name
WHERE c.table_schema = %s
  AND t.table_type   = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position
"""

_SQL_FKS = """
SELECT
    k.table_name,
    k.column_name,
    k.constraint_name,
    k.referenced_table_name,
    k.referenced_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.key_column_usage k
LEFT JOIN information_schema.referential_constraints rc
  ON  rc.constraint_schema = k.table_schema
 AND  rc.constraint_name   = k.constraint_name
WHERE k.table_schema           = %s
  AND k.referenced_table_name IS NOT NULL
ORDER BY k.table_name, k.ordinal_position
"""

# pymysql OperationalError 코드 -> 사용자 메시지 매핑
_MYSQL_ERROR_MAP: dict[int, tuple[str, str]] = {
    1045: ('인증 실패: 사용자명 또는 비밀번호를 확인해주세요.', 'AUTH_FAILED'),
    1044: ('권한 부족: 해당 DB 접근 권한이 없습니다.', 'PERMISSION_DENIED'),
    1049: ('DB가 존재하지 않습니다.', 'CONNECTION_REFUSED'),
    2003: ('연결 실패: 호스트 또는 포트를 확인해주세요.', 'CONNECTION_REFUSED'),
    2005: ('알 수 없는 호스트입니다.', 'CONNECTION_REFUSED'),
    2013: ('연결이 끊어졌습니다.', 'CONNECTION_REFUSED'),
}


class MySQLConnector(BaseConnector):

    def __init__(
        self,
        host:     str,
        port:     int,
        database: str,
        username: str,
        password: str,           # 로그에 미노출
    ) -> None:
        self._database = database
        # password는 _cfg 내부에만 보관
        self._cfg: dict[str, Any] = {
            'host':            host,
            'port':            port,
            'database':        database,
            'user':            username,
            'password':        password,
            'charset':         'utf8mb4',
            'connect_timeout': 5,
            'cursorclass':     pymysql.cursors.DictCursor,
        }

    # 연결 컨텍스트 매니저
    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        conn = None
        try:
            conn = self._connect()
            yield conn
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass  # close 실패는 무시

    def _connect(self) -> Any:
        try:
            return pymysql.connect(**self._cfg)
        except pymysql.err.OperationalError as e:
            code, _ = e.args
            msg, err_code = _MYSQL_ERROR_MAP.get(
                code,
                (f'DB 연결 오류 (code={code})', 'UNKNOWN'),
            )
            raise ConnectorError(msg, err_code) from e
        except pymysql.err.DatabaseError as e:
            raise ConnectorError(f'DB 오류: {e}', 'UNKNOWN') from e
        except Exception as e:
            raise ConnectorError(f'연결 중 오류: {e}', 'UNKNOWN') from e

    def get_db_version(self, conn: Any) -> str:
        with conn.cursor() as cur:
            cur.execute('SELECT VERSION() AS ver')
            row = cur.fetchone()
        return f"MySQL {row['ver']}" if row else 'MySQL'

    def test(self) -> dict:
        try:
            with self.connection() as conn:
                version = self.get_db_version(conn)
            logger.info('test OK: host=%s db=%s', self._cfg['host'], self._database)
            return {'success': True, 'message': '연결 성공', 'db_version': version}
        except ConnectorError as e:
            return {'success': False, 'message': e.message, 'error_code': e.error_code}

    def extract_columns_raw(self, conn: Any, schema: str) -> list[dict]:
        with conn.cursor() as cur:
            cur.execute(_SQL_COLUMNS, (schema,))
            return cur.fetchall()   # list[dict] via DictCursor

    def extract_fks_raw(self, conn: Any, schema: str) -> list[dict]:
        with conn.cursor() as cur:
            cur.execute(_SQL_FKS, (schema,))
            return cur.fetchall()
