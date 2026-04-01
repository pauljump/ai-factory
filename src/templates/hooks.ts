export function generateSessionStartHook(): string {
  return `#!/usr/bin/env bash
# Factory SessionStart hook — injects relevant factory knowledge
set -euo pipefail

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

factory _hook session-start --cwd "$CWD"
`
}

export function generateStopHook(): string {
  return `#!/usr/bin/env bash
# Factory Stop hook — logs session metrics
set -euo pipefail

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

factory _hook stop --cwd "$CWD"
`
}
