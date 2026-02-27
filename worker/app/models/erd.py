from typing import Literal, Optional
from pydantic import BaseModel
from app.models.metadata import SchemaMetadata

ConfidenceLevel = Literal['FK', 'HIGH', 'MEDIUM', 'LOW']
Cardinality = Literal['1:1', '1:N', 'N:1', 'N:M']


class InferredRelation(BaseModel):
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    confidence: ConfidenceLevel
    cardinality: Cardinality
    reason: Optional[str] = None
    evidence: Optional[str] = None
    score: Optional[float] = None


class ErdColumn(BaseModel):
    name: str
    data_type: str
    nullable: bool
    is_pk: bool
    is_fk: bool
    comment: str = ''


class ErdTable(BaseModel):
    name: str
    comment: str = ''
    domain: str = ''
    columns: list[ErdColumn]


class ErdGraph(BaseModel):
    tables: list[ErdTable]
    relations: list[InferredRelation]
    extracted_at: str


class InferRelationsRequest(BaseModel):
    metadata: SchemaMetadata


class BuildErdRequest(BaseModel):
    metadata: SchemaMetadata
    relations: list[InferredRelation]
