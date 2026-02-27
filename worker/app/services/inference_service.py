from __future__ import annotations

from typing import Iterable

from app.models.metadata import SchemaMetadata
from app.models.erd import InferredRelation


def _norm(name: str) -> str:
    return name.lower()


def _candidate_tables(table_names: set[str], base: str) -> list[str]:
    candidates = [base, f"{base}s", base.rstrip('s')]
    out = []
    for c in candidates:
        if c in table_names:
            out.append(c)
    return out


def _confidence_from_score(score: float) -> str:
    if score >= 0.9:
        return 'FK'
    if score >= 0.75:
        return 'HIGH'
    if score >= 0.55:
        return 'MEDIUM'
    return 'LOW'


def infer_relations(metadata: SchemaMetadata) -> list[InferredRelation]:
    relations: list[InferredRelation] = []
    seen = set()

    table_names = {_norm(t.name) for t in metadata.tables}
    table_comment_map = { _norm(t.name): (t.comment or '') for t in metadata.tables }

    def add(rel: InferredRelation) -> None:
        key = (
            rel.source_table,
            rel.source_column,
            rel.target_table,
            rel.target_column,
            rel.confidence,
        )
        if key in seen:
            return
        seen.add(key)
        relations.append(rel)

    # 1) 실제 FK
    for table in metadata.tables:
        for fk in table.fk_refs:
            add(
                InferredRelation(
                    source_table=table.name,
                    source_column=fk.column_name,
                    target_table=fk.ref_table,
                    target_column=fk.ref_column,
                    confidence='FK',
                    cardinality='N:1',
                    reason='FK constraint',
                    evidence=f"{table.name}.{fk.column_name} -> {fk.ref_table}.{fk.ref_column}",
                    score=1.0,
                )
            )

    # 2) 컬럼명 규칙 + 코멘트 힌트
    for table in metadata.tables:
        for col in table.columns:
            name = _norm(col.name)
            col_comment = (col.comment or '').lower()

            # _id 패턴
            if name.endswith('_id'):
                base = name[:-3]
                for target in _candidate_tables(table_names, base):
                    score = 0.8
                    reason = ['컬럼명 _id 규칙']
                    evidence = [f"{table.name}.{col.name} -> {target}.id"]

                    # 코멘트에 테이블명/코멘트 포함
                    t_comment = table_comment_map.get(target, '').lower()
                    if target in col_comment or (t_comment and t_comment in col_comment):
                        score += 0.1
                        reason.append('컬럼 코멘트 일치')
                        evidence.append(f"comment: {col.comment}")

                    add(
                        InferredRelation(
                            source_table=table.name,
                            source_column=col.name,
                            target_table=target,
                            target_column='id',
                            confidence=_confidence_from_score(score),
                            cardinality='N:1',
                            reason=' + '.join(reason),
                            evidence='; '.join(evidence),
                            score=score,
                        )
                    )

            # _cd / _code 패턴
            if name.endswith('_cd') or name.endswith('_code'):
                base = name.replace('_code', '').replace('_cd', '')
                for target in _candidate_tables(table_names, base):
                    score = 0.6
                    reason = ['컬럼명 _cd/_code 규칙']
                    evidence = [f"{table.name}.{col.name} -> {target}.code"]

                    t_comment = table_comment_map.get(target, '').lower()
                    if target in col_comment or (t_comment and t_comment in col_comment):
                        score += 0.1
                        reason.append('컬럼 코멘트 일치')
                        evidence.append(f"comment: {col.comment}")

                    add(
                        InferredRelation(
                            source_table=table.name,
                            source_column=col.name,
                            target_table=target,
                            target_column='code',
                            confidence=_confidence_from_score(score),
                            cardinality='N:1',
                            reason=' + '.join(reason),
                            evidence='; '.join(evidence),
                            score=score,
                        )
                    )

            # _no 패턴
            if name.endswith('_no'):
                base = name[:-3]
                for target in _candidate_tables(table_names, base):
                    score = 0.45
                    reason = ['컬럼명 _no 규칙']
                    evidence = [f"{table.name}.{col.name} -> {target}.no"]

                    t_comment = table_comment_map.get(target, '').lower()
                    if target in col_comment or (t_comment and t_comment in col_comment):
                        score += 0.1
                        reason.append('컬럼 코멘트 일치')
                        evidence.append(f"comment: {col.comment}")

                    add(
                        InferredRelation(
                            source_table=table.name,
                            source_column=col.name,
                            target_table=target,
                            target_column='no',
                            confidence=_confidence_from_score(score),
                            cardinality='N:1',
                            reason=' + '.join(reason),
                            evidence='; '.join(evidence),
                            score=score,
                        )
                    )

    # 3) PK 컬럼명 직접 매칭 (보수적)
    for table in metadata.tables:
        for pk in table.pk_columns:
            pk_norm = _norm(pk)
            for t in metadata.tables:
                if t.name == table.name:
                    continue
                for col in t.columns:
                    if _norm(col.name) == pk_norm:
                        score = 0.55
                        add(
                            InferredRelation(
                                source_table=t.name,
                                source_column=col.name,
                                target_table=table.name,
                                target_column=pk,
                                confidence=_confidence_from_score(score),
                                cardinality='N:1',
                                reason='PK 컬럼명 직접 일치',
                                evidence=f"{t.name}.{col.name} == {table.name}.{pk}",
                                score=score,
                            )
                        )

    return relations
