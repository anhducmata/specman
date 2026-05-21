#!/usr/bin/env bash
# Claude Code Stop hook — auto-finalizes active session on exit.
# Fires from the USER'S PROJECT directory (Claude Code's cwd).
# Always exits 0. Must never block or crash Claude Code.

set -e
trap 'exit 0' ERR

COMMANDER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$(pwd)"
CURRENT_SESSION_FILE="$PROJECT_DIR/.claude/current-session"

[[ -f "$CURRENT_SESSION_FILE" ]] || exit 0

SESSION_PATH=$(cat "$CURRENT_SESSION_FILE" | tr -d '[:space:]')

if [[ ! -f "$SESSION_PATH" ]]; then
  rm -f "$CURRENT_SESSION_FILE"
  exit 0
fi

STATUS=$(grep '^status:' "$SESSION_PATH" | head -1 | sed 's/status: *"\(.*\)"/\1/')
if [[ "$STATUS" != "in-progress" ]]; then
  rm -f "$CURRENT_SESSION_FILE"
  exit 0
fi

cd "$COMMANDER_DIR"

SLUG=$(basename "$SESSION_PATH" .md)
git add "$SESSION_PATH" 2>/dev/null || true
git diff --cached --quiet || git commit -m "session: auto-save $SLUG" 2>/dev/null || true

# Update project-local session-index.md
DATE=$(grep '^date:' "$SESSION_PATH" | head -1 | sed 's/date: *"\(.*\)"/\1/')
ID=$(grep '^id:' "$SESSION_PATH" | head -1 | sed 's/id: *"\(.*\)"/\1/')
TITLE=$(grep '^# Session:' "$SESSION_PATH" | head -1 | sed 's/# Session: *//')

PROJ_DIR="$(dirname "$(dirname "$SESSION_PATH")")"
INDEX="$PROJ_DIR/session-index.md"

if [[ ! -f "$INDEX" ]]; then
  printf "# Session Index\n\n| ID | Date | Status | Title | File |\n|---|---|---|---|---|\n" > "$INDEX"
fi

REL_PATH="${SESSION_PATH#$COMMANDER_DIR/}"
if ! grep -q "$ID" "$INDEX" 2>/dev/null; then
  echo "| $ID | $DATE | auto-saved | ${TITLE:-untitled} | $REL_PATH |" >> "$INDEX"
  git add "$INDEX" 2>/dev/null || true
  git diff --cached --quiet || git commit -m "index: update $(basename "$PROJ_DIR")/session-index" 2>/dev/null || true
fi

rm -f "$CURRENT_SESSION_FILE"
exit 0
