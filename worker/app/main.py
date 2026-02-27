import logging
import os

from fastapi import FastAPI
from app.routers import worker

# 로깅 설정 (비밀번호 로그 노출 방지 위해 INFO 레벨)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)

app = FastAPI(
    title='ERDAI Python Worker',
    description='DB 메타데이터 추출 · 관계 추론 · ERD 빌드',
    version='0.1.0',
    docs_url='/docs',
    redoc_url=None,
)

app.include_router(worker.router, prefix='/worker')


@app.get('/health', tags=['system'])
def root_health() -> dict:
    return {'ok': True, 'env': os.getenv('APP_ENV', 'local')}
