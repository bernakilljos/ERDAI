import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.connection import (
    ExtractMetadataRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.models.metadata import SchemaMetadata
from app.models.erd import (
    InferredRelation,
    InferRelationsRequest,
    BuildErdRequest,
    ErdGraph,
)
from app.services.connectors.base import ConnectorError, UnsupportedDbTypeError
from app.services.connectors.factory import make_connector
from app.services.metadata_service import extract_metadata
from app.services.inference_service import infer_relations
from app.services.export_service import build_dbml, build_mermaid

logger = logging.getLogger(__name__)
router = APIRouter(tags=['worker'])


# ── /worker/health ─────────────────────────────────────────────────────────────
@router.get('/health')
def health() -> dict:
    return {'ok': True}


# ── /worker/test-connection ────────────────────────────────────────────────────
@router.post('/test-connection', response_model=TestConnectionResponse)
def test_connection(req: TestConnectionRequest) -> TestConnectionResponse:
    """
    Node API의 POST /connections/test에서 호출.
    비밀번호는 로그에 남기지 않음.
    """
    logger.info(
        'test-connection: db_type=%s host=%s:%d user=%s',
        req.db_type, req.host, req.port, req.username,
    )
    try:
        connector = make_connector(req)
        result = connector.test()
        return TestConnectionResponse(**result)

    except UnsupportedDbTypeError as e:
        raise HTTPException(
            status_code=501,
            detail={'message': f"'{e.db_type}' 커넥터는 아직 구현되지 않았습니다."},
        )
    except Exception as e:
        logger.error('test-connection unexpected: %s', e)
        raise HTTPException(500, detail={'message': '서버 오류가 발생했습니다.'})


# ── /worker/extract-metadata ───────────────────────────────────────────────────
@router.post('/extract-metadata', response_model=SchemaMetadata)
def extract_metadata_endpoint(req: ExtractMetadataRequest) -> SchemaMetadata:
    """
    스키마 전체 메타데이터 추출.
    pymysql은 블로킹 I/O지만 FastAPI가 내부적으로 threadpool에서 실행.

    schema 결정 우선순위: database > service_name > sid
    """
    schema = req.database or req.service_name or req.sid
    if not schema:
        raise HTTPException(
            status_code=400,
            detail={'message': 'database, service_name, sid 중 하나가 필요합니다.'},
        )

    logger.info(
        'extract-metadata: db_type=%s host=%s:%d schema=%s user=%s',
        req.db_type, req.host, req.port, schema, req.username,
    )

    try:
        connector = make_connector(req)
        return extract_metadata(connector, schema)

    except UnsupportedDbTypeError as e:
        raise HTTPException(
            status_code=501,
            detail={'message': f"'{e.db_type}' 커넥터는 아직 구현되지 않았습니다."},
        )
    except ConnectorError as e:
        raise HTTPException(
            status_code=400,
            detail={'message': e.message, 'errorCode': e.error_code},
        )
    except Exception as e:
        logger.error('extract-metadata unexpected: %s', e)
        raise HTTPException(500, detail={'message': '메타데이터 추출 중 오류가 발생했습니다.'})


# ── /worker/infer-relations ────────────────────────────────────────────────────
@router.post('/infer-relations', response_model=list[InferredRelation])
def infer_relations_endpoint(req: InferRelationsRequest) -> list[InferredRelation]:
    return infer_relations(req.metadata)


# ── /worker/build-erd ─────────────────────────────────────────────────────────
@router.post('/build-erd', response_model=ErdGraph)
def build_erd_endpoint(req: BuildErdRequest) -> ErdGraph:
    tables = []
    for table in req.metadata.tables:
        columns = []
        fk_cols = {fk.column_name for fk in table.fk_refs}
        for col in table.columns:
            columns.append({
                'name': col.name,
                'data_type': col.data_type,
                'nullable': col.nullable,
                'is_pk': col.is_pk,
                'is_fk': col.name in fk_cols,
                'comment': col.comment or '',
            })
        tables.append({
            'name': table.name,
            'comment': table.comment or '',
            'domain': table.domain or '',
            'columns': columns,
        })

    return ErdGraph(
        tables=tables,
        relations=req.relations,
        extracted_at=req.metadata.extracted_at,
    )


# ── /worker/export/dbml ───────────────────────────────────────────────────────
@router.post('/export/dbml', response_class=PlainTextResponse)
def export_dbml(req: BuildErdRequest) -> str:
    return build_dbml(req.metadata, req.relations)


# ── /worker/export/mermaid ────────────────────────────────────────────────────
@router.post('/export/mermaid', response_class=PlainTextResponse)
def export_mermaid(req: BuildErdRequest) -> str:
    return build_mermaid(req.metadata, req.relations)
