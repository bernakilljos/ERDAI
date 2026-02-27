#!/usr/bin/env bash
set -e
echo "[ERDAI] validate docs..."

required_files=(
  "docs/modeling/logical-model.md"
  "docs/modeling/physical-model.md"
  "docs/modeling/naming-rules.md"
  "docs/modeling/domain-dictionary.md"
  "docs/erd/erd-logical.md"
  "docs/erd/erd-physical.md"
)

for f in "${required_files[@]}"; do
  [ -f "$f" ] || { echo "[ERDAI] Missing file: $f" >&2; exit 2; }
done

grep -q "논리 데이터 모델" docs/modeling/logical-model.md || { echo "[ERDAI] logical-model title check failed" >&2; exit 3; }
grep -q "물리 데이터 모델" docs/modeling/physical-model.md || { echo "[ERDAI] physical-model title check failed" >&2; exit 3; }

echo "[ERDAI] docs validation OK"
