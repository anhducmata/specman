#!/usr/bin/env bash
# Usage:
#   log-session.sh start <session-file>    → commit session as in-progress
#   log-session.sh end <session-file>      → commit session as completed

set -e

COMMANDER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

action=$1
session_file=$2

if [[ -z "$action" || -z "$session_file" ]]; then
  echo "Usage: log-session.sh <start|end> <path-to-session-file>"
  exit 1
fi

if [[ ! -f "$session_file" ]]; then
  echo "Error: session file not found: $session_file"
  exit 1
fi

# Extract session ID from frontmatter
session_id=$(grep '^id:' "$session_file" | head -1 | sed 's/id: *"\(.*\)"/\1/')
slug=$(basename "$session_file" .md)

cd "$COMMANDER_DIR"

git add "$session_file"

if [[ "$action" == "start" ]]; then
  git commit -m "session: start $slug"
  echo "Session started: $slug"
elif [[ "$action" == "end" ]]; then
  git commit -m "session: complete $slug"
  echo "Session completed: $slug"

  # Update session index
  echo "Remember to update meta/session-index.md with this session."
else
  echo "Error: action must be 'start' or 'end'"
  exit 1
fi
