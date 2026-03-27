#!/bin/bash
# Koba: Convert Paul's monorepo into a factory workspace
# Simulates a fresh user downloading koba and importing their projects
#
# Run: bash /Users/mini-home/Desktop/koba/scripts/convert-monorepo.sh
# Or dry-run first: DRY_RUN=1 bash /Users/mini-home/Desktop/koba/scripts/convert-monorepo.sh

set -euo pipefail

KOBA_BIN="/Users/mini-home/Desktop/koba/bin/koba.ts"
TSX="/Users/mini-home/Desktop/koba/node_modules/.bin/tsx"
SOURCE="/Users/mini-home/Desktop/monorepo"
WORKSPACE="/Users/mini-home/Desktop/my-factory"

echo "============================================"
echo "  Koba Factory Conversion"
echo "============================================"
echo ""
echo "  Source:    $SOURCE"
echo "  Workspace: $WORKSPACE"
echo ""

# Step 1: Clean slate — remove any previous test workspace
if [ -d "$WORKSPACE" ]; then
  echo "Removing previous workspace at $WORKSPACE..."
  rm -rf "$WORKSPACE"
fi

# Step 2: Init fresh workspace (simulates: koba init my-factory)
echo "Step 1/4: Initializing fresh factory workspace..."
"$TSX" "$KOBA_BIN" init "$WORKSPACE"
echo ""

# Step 3: Convert the monorepo
cd "$WORKSPACE"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "Step 2/4: Running dry-run conversion..."
  "$TSX" "$KOBA_BIN" convert "$SOURCE" --dry-run
  echo ""
  echo "Dry run complete. Re-run without DRY_RUN=1 to execute."
  exit 0
fi

echo "Step 2/4: Converting monorepo into factory workspace..."
"$TSX" "$KOBA_BIN" convert "$SOURCE"
echo ""

# Step 4: Scan to regenerate CLAUDE.md
echo "Step 3/4: Scanning workspace and regenerating CLAUDE.md..."
"$TSX" "$KOBA_BIN" scan
echo ""

# Step 5: Show status
echo "Step 4/4: Factory status..."
"$TSX" "$KOBA_BIN" status
echo ""

# Step 6: Size comparison
echo "============================================"
echo "  SIZE COMPARISON"
echo "============================================"
echo ""
MONO_SIZE=$(du -sh "$SOURCE" 2>/dev/null | cut -f1)
FACTORY_SIZE=$(du -sh "$WORKSPACE" 2>/dev/null | cut -f1)
echo "  Original monorepo:  $MONO_SIZE"
echo "  Koba workspace:     $FACTORY_SIZE"
echo ""

# Count projects, packages, knowledge
PROJECT_COUNT=$(ls "$WORKSPACE/projects" 2>/dev/null | wc -l | tr -d ' ')
PACKAGE_COUNT=$(ls "$WORKSPACE/packages" 2>/dev/null | wc -l | tr -d ' ')
KNOWLEDGE_COUNT=$(find "$WORKSPACE/knowledge" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Projects:  $PROJECT_COUNT"
echo "  Packages:  $PACKAGE_COUNT"
echo "  Knowledge: $KNOWLEDGE_COUNT entries"
echo ""

# Knowledge stats
echo "============================================"
echo "  KNOWLEDGE STATS"
echo "============================================"
"$TSX" "$KOBA_BIN" knowledge stats 2>/dev/null || echo "  (knowledge stats not available)"
echo ""

echo "============================================"
echo "  DONE — workspace ready at $WORKSPACE"
echo "============================================"
echo ""
echo "Next steps:"
echo "  cd $WORKSPACE"
echo "  # Start a Claude Code session — hooks will auto-inject knowledge"
echo ""
