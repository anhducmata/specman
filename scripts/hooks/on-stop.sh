#!/usr/bin/env bash
# Claude Code Stop hook — auto-finalizes active session on exit.
# Always exits 0. Must never block or crash Claude Code.

set -e
trap 'exit 0' ERR

COMMANDER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CURRENT_SESSION_FILE="$COMMANDER_DIR/.claude/current-session"

# No active session — nothing to do
[[ -f "$CURRENT_SESSION_FILE" ]] || exit 0

SESSION_PATH=$(cat "$CURRENT_SESSION_FILE" | tr -d '[:space:]')

# Session file missing or already completed — clear state and exit
if [[ ! -f "$SESSION_PATH" ]]; then
  rm -f "$CURRENT_SESSION_FILE"
  exit 0
fi

# Check if still in-progress
STATUS=$(grep '^status:' "$SESSION_PATH" | head -1 | sed 's/status: *"\(.*\)"/\1/')
if [[ "$STATUS" != "in-progress" ]]; then
  rm -f "$CURRENT_SESSION_FILE"
  exit 0
fi

cd "$COMMANDER_DIR"

# Commit the session as auto-saved
SLUG=$(basename "$SESSION_PATH" .md)
git add "$SESSION_PATH" 2>/dev/null || true
git diff --cached --quiet || git commit -m "session: auto-save $SLUG" 2>/dev/null || true

# Append to session-index.md
DATE=$(grep '^date:' "$SESSION_PATH" | head -1 | sed 's/date: *"\(.*\)"/\1/')
ID=$(grep '^id:' "$SESSION_PATH" | head -1 | sed 's/id: *"\(.*\)"/\1/')
PROJECTS=$(grep '^projects:' "$SESSION_PATH" | head -1 | sed 's/projects: *//')
TITLE=$(grep '^# Session:' "$SESSION_PATH" | head -1 | sed 's/# Session: *//')

INDEX="$COMMANDER_DIR/meta/session-index.md"
# Only append if this session ID isn't already in the index
if ! grep -q "$ID" "$INDEX" 2>/dev/null; then
  REL_PATH="${SESSION_PATH#$COMMANDER_DIR/}"
  echo "| $ID | $DATE | $PROJECTS | auto-saved | ${TITLE:-untitled} | $REL_PATH |" >> "$INDEX"
  git add "$INDEX" 2>/dev/null || true
  git diff --cached --quiet || git commit -m "index: update session-index" 2>/dev/null || true
fi

# Clear current-session state
rm -f "$CURRENT_SESSION_FILE"

exit 0
