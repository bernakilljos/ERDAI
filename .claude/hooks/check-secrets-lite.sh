#!/usr/bin/env bash
set -e
echo "[ERDAI] secret scan (lite)..."
if grep -RInE "(password\s*=\s*['\"][^'\"]+['\"]|DB_PASSWORD\s*=\s*[^ ]+|Authorization: Bearer)" -- .   --exclude-dir=.git --exclude=.env --exclude=.env.local --exclude=*.zip 2>/dev/null; then
  echo "[ERDAI] Potential secret detected." >&2
  exit 4
fi
echo "[ERDAI] secret scan OK"
