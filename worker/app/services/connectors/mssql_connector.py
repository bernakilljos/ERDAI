"""
MSSQL 커넥터 (pymssql 기반)
"""
from contextlib import contextmanager
from typing import Any, Generator

import pymssql

from .base import BaseConnector, ConnectorError


class MSSQLConnector(BaseConnector):
    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> None:
        self._cfg = {
            'server': host,
            'port': port,
            'user': username,
            'password': password,
            'database': database,
        }
        self._database = database

    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        conn = None
        try:
            conn = pymssql.connect(**self._cfg)
            yield conn
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def get_db_version(self, conn: Any) -> str:
        cur = conn.cursor()
        cur.execute('SELECT @@VERSION')
        row = cur.fetchone()
        return f"MSSQL {row[0]}" if row else 'MSSQL'

    def test(self) -> dict:
        try:
            with self.connection() as conn:
                version = self.get_db_version(conn)
            return {'success': True, 'message': '연결 성공', 'db_version': version}
        except Exception as e:
            return {'success': False, 'message': f'연결 실패: {e}', 'error_code': 'CONNECTION_REFUSED'}

    def extract_columns_raw(self, conn: Any, schema: str) -> list[dict]:
        sql = """
        SELECT
            c.TABLE_SCHEMA AS schema_name,
            c.TABLE_NAME AS table_name,
            ISNULL(ep_t.value, '') AS table_comment,
            c.ORDINAL_POSITION AS col_no,
            c.COLUMN_NAME AS column_name,
            c.DATA_TYPE +
              CASE
                WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
                WHEN c.NUMERIC_PRECISION IS NOT NULL THEN '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR) + ')'
                ELSE ''
              END AS data_type,
            CASE WHEN c.IS_NULLABLE = 'NO' THEN 'N' ELSE 'Y' END AS nullable_yn,
            '' AS key_type,
            'N' AS pk_yn,
            c.COLUMN_DEFAULT AS default_value,
            '' AS extra_info,
            ISNULL(ep_c.value, '') AS column_comment
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN sys.extended_properties ep_t
          ON ep_t.major_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
         AND ep_t.minor_id = 0
         AND ep_t.name = 'MS_Description'
        LEFT JOIN sys.extended_properties ep_c
          ON ep_c.major_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
         AND ep_c.minor_id = c.ORDINAL_POSITION
         AND ep_c.name = 'MS_Description'
        WHERE c.TABLE_SCHEMA = %s
        ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        """
        cur = conn.cursor(as_dict=True)
        cur.execute(sql, (schema,))
        return list(cur.fetchall())

    def extract_fks_raw(self, conn: Any, schema: str) -> list[dict]:
        sql = """
        SELECT
            kcu.TABLE_NAME AS table_name,
            kcu.COLUMN_NAME AS column_name,
            rc.CONSTRAINT_NAME AS constraint_name,
            kcu2.TABLE_NAME AS referenced_table_name,
            kcu2.COLUMN_NAME AS referenced_column_name,
            rc.UPDATE_RULE AS update_rule,
            rc.DELETE_RULE AS delete_rule
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu2
          ON rc.UNIQUE_CONSTRAINT_NAME = kcu2.CONSTRAINT_NAME
         AND kcu.ORDINAL_POSITION = kcu2.ORDINAL_POSITION
        WHERE kcu.TABLE_SCHEMA = %s
        ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION
        """
        cur = conn.cursor(as_dict=True)
        cur.execute(sql, (schema,))
        return list(cur.fetchall())
