"""
Oracle 커넥터 (oracledb 기반)
"""
from contextlib import contextmanager
from typing import Any, Generator

import oracledb

from .base import BaseConnector, ConnectorError


class OracleConnector(BaseConnector):
    def __init__(
        self,
        host: str,
        port: int,
        service_name: str | None,
        sid: str | None,
        username: str,
        password: str,
    ) -> None:
        if service_name:
            dsn = oracledb.makedsn(host, port, service_name=service_name)
        else:
            dsn = oracledb.makedsn(host, port, sid=sid)
        self._cfg = {
            'user': username,
            'password': password,
            'dsn': dsn,
        }

    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        conn = None
        try:
            conn = oracledb.connect(**self._cfg)
            yield conn
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def get_db_version(self, conn: Any) -> str:
        cur = conn.cursor()
        cur.execute("SELECT banner FROM v$version WHERE banner LIKE 'Oracle%'")
        row = cur.fetchone()
        return row[0] if row else 'Oracle'

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
            c.owner AS schema_name,
            c.table_name AS table_name,
            tc.comments AS table_comment,
            c.column_id AS col_no,
            c.column_name AS column_name,
            c.data_type ||
              CASE
                WHEN c.data_type IN ('VARCHAR2', 'CHAR') THEN '(' || c.data_length || ')'
                WHEN c.data_type IN ('NUMBER') AND c.data_precision IS NOT NULL THEN '(' || c.data_precision || ',' || c.data_scale || ')'
                ELSE ''
              END AS data_type,
            CASE WHEN c.nullable = 'N' THEN 'N' ELSE 'Y' END AS nullable_yn,
            '' AS key_type,
            'N' AS pk_yn,
            c.data_default AS default_value,
            '' AS extra_info,
            cc.comments AS column_comment
        FROM all_tab_columns c
        LEFT JOIN all_tab_comments tc
          ON tc.owner = c.owner AND tc.table_name = c.table_name
        LEFT JOIN all_col_comments cc
          ON cc.owner = c.owner AND cc.table_name = c.table_name AND cc.column_name = c.column_name
        WHERE c.owner = :schema
        ORDER BY c.table_name, c.column_id
        """
        cur = conn.cursor()
        cur.execute(sql, schema=schema.upper())
        cols = [d[0].lower() for d in cur.description]
        rows = []
        for r in cur.fetchall():
            rows.append({cols[i]: r[i] for i in range(len(cols))})
        return rows

    def extract_fks_raw(self, conn: Any, schema: str) -> list[dict]:
        sql = """
        SELECT
            a.table_name AS table_name,
            a.column_name AS column_name,
            a.constraint_name AS constraint_name,
            c_pk.table_name AS referenced_table_name,
            b.column_name AS referenced_column_name,
            'NO ACTION' AS update_rule,
            'NO ACTION' AS delete_rule
        FROM all_cons_columns a
        JOIN all_constraints c
          ON a.owner = c.owner AND a.constraint_name = c.constraint_name
        JOIN all_constraints c_pk
          ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
        JOIN all_cons_columns b
          ON b.owner = c_pk.owner AND b.constraint_name = c_pk.constraint_name AND b.position = a.position
        WHERE c.constraint_type = 'R'
          AND a.owner = :schema
        ORDER BY a.table_name, a.position
        """
        cur = conn.cursor()
        cur.execute(sql, schema=schema.upper())
        cols = [d[0].lower() for d in cur.description]
        rows = []
        for r in cur.fetchall():
            rows.append({cols[i]: r[i] for i in range(len(cols))})
        return rows
