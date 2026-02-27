from __future__ import annotations

from app.models.metadata import SchemaMetadata
from app.models.erd import InferredRelation


def build_dbml(metadata: SchemaMetadata, relations: list[InferredRelation]) -> str:
    lines: list[str] = []
    for table in metadata.tables:
        lines.append(f"Table {table.name} {{")
        for col in table.columns:
            attrs = []
            if col.is_pk:
                attrs.append('pk')
            if not col.nullable:
                attrs.append('not null')
            if col.comment:
                attrs.append(f"note: '{col.comment.replace("'", "")}'")
            attr_str = f" [{', '.join(attrs)}]" if attrs else ''
            lines.append(f"  {col.name} {col.data_type}{attr_str}")
        lines.append('}')
        lines.append('')

    for rel in relations:
        lines.append(
            f"Ref: {rel.source_table}.{rel.source_column} > {rel.target_table}.{rel.target_column}"
        )

    return '\n'.join(lines).strip() + '\n'


def _mermaid_cardinality(rel: InferredRelation) -> str:
    if rel.cardinality == '1:1':
        return '||--||'
    if rel.cardinality == '1:N':
        return '||--o{'
    if rel.cardinality == 'N:1':
        return '}o--||'
    return '}o--o{'


def build_mermaid(metadata: SchemaMetadata, relations: list[InferredRelation]) -> str:
    lines: list[str] = ['erDiagram']

    for table in metadata.tables:
        lines.append(f"  {table.name} {{")
        for col in table.columns:
            nullable = '' if col.nullable else ' not null'
            lines.append(f"    {col.data_type} {col.name}{nullable}")
        lines.append('  }')

    for rel in relations:
        card = _mermaid_cardinality(rel)
        label = rel.confidence
        lines.append(
            f"  {rel.source_table} {card} {rel.target_table} : {label}"
        )

    return '\n'.join(lines).strip() + '\n'
