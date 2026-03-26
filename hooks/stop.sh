#!/usr/bin/env bash
# Claude Code Stop hook — logs session end metrics
set -euo pipefail

FACTORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

INPUT=$(cat)
CWD=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).cwd || ''); }
    catch { console.log(''); }
  });
")

if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

node --import "$FACTORY_ROOT/node_modules/tsx/dist/esm/index.cjs" "$FACTORY_ROOT/src/cli-capture.ts" "$CWD"
