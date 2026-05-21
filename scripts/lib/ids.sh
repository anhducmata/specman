#!/usr/bin/env bash
# Shared ID helpers — all IDs are scoped per project

COMMANDER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# next_session_id <project> → next zero-padded 3-digit number
next_session_id() {
  local proj="$1"
  local dir="$COMMANDER_DIR/projects/$proj/sessions"
  local max=0
  for f in "$dir"/????-??-??--???--*.md; do
    [[ -f "$f" ]] || continue
    local num
    num=$(basename "$f" | sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}--\([0-9]\{3\}\)--.*/\1/')
    num=$((10#$num))
    (( num > max )) && max=$num
  done
  printf "%03d" $((max + 1))
}

# next_decision_id <project> → next DEC-NNN
next_decision_id() {
  local proj="$1"
  local dir="$COMMANDER_DIR/projects/$proj/decisions"
  local max=0
  for f in "$dir"/DEC-???--*.md; do
    [[ -f "$f" ]] || continue
    local num
    num=$(basename "$f" | sed 's/DEC-\([0-9]\{3\}\)--.*/\1/')
    num=$((10#$num))
    (( num > max )) && max=$num
  done
  printf "DEC-%03d" $((max + 1))
}

# next_feedback_id <project> → next FB-NNN
next_feedback_id() {
  local proj="$1"
  local dir="$COMMANDER_DIR/projects/$proj/feedback"
  local max=0
  for f in "$dir"/FB-???--*.md; do
    [[ -f "$f" ]] || continue
    local num
    num=$(basename "$f" | sed 's/FB-\([0-9]\{3\}\)--.*/\1/')
    num=$((10#$num))
    (( num > max )) && max=$num
  done
  printf "FB-%03d" $((max + 1))
}

# projects_array_yaml [proj1 proj2 ...] → ["proj1", "proj2"]
projects_array_yaml() {
  if [[ $# -eq 0 ]]; then echo "[]"; return; fi
  local result="["
  for p in "$@"; do result+="\"$p\", "; done
  result="${result%, }]"
  echo "$result"
}
