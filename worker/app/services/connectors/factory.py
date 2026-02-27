"""
커넥터 팩토리
- db_type에 따라 구체 커넥터를 생성한다.
"""
from app.models.connection import DbConnectionRequest
from app.services.connectors.base import BaseConnector, UnsupportedDbTypeError
from app.services.connectors.mysql_connector import MySQLConnector
from app.services.connectors.mssql_connector import MSSQLConnector
from app.services.connectors.oracle_connector import OracleConnector


def make_connector(req: DbConnectionRequest) -> BaseConnector:
    if req.db_type == 'mysql':
        return MySQLConnector(
            host=req.host,
            port=req.port,
            database=req.database,   # type: ignore[arg-type]
            username=req.username,
            password=req.password,
        )

    if req.db_type == 'mssql':
        return MSSQLConnector(
            host=req.host,
            port=req.port,
            database=req.database,   # type: ignore[arg-type]
            username=req.username,
            password=req.password,
        )

    if req.db_type == 'oracle':
        return OracleConnector(
            host=req.host,
            port=req.port,
            service_name=req.service_name,
            sid=req.sid,
            username=req.username,
            password=req.password,
        )

    raise UnsupportedDbTypeError(req.db_type)
