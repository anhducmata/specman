#!/usr/bin/env bash
# Integration tests for bin/specman
# Run: bash tests/specman.sh
# Exits 0 on success, non-zero on first failure.

set -euo pipefail

SPECMAN="$(cd "$(dirname "$0")/.." && pwd)/bin/specman"
PASS=0; FAIL=0

# ─── Harness ──────────────────────────────────────────────────────────────────

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  PASS  $desc"; (( PASS++ )) || true
  else
    echo "  FAIL  $desc"
    echo "        expected: $expected"
    echo "        actual  : $actual"
    (( FAIL++ )) || true
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo "  PASS  $desc"; (( PASS++ )) || true
  else
    echo "  FAIL  $desc"
    echo "        expected to contain: $needle"
    echo "        actual: $haystack"
    (( FAIL++ )) || true
  fi
}

assert_file_exists() {
  local desc="$1" path="$2"
  if [[ -f "$path" ]]; then
    echo "  PASS  $desc"; (( PASS++ )) || true
  else
    echo "  FAIL  $desc (missing: $path)"
    (( FAIL++ )) || true
  fi
}

assert_file_contains() {
  local desc="$1" needle="$2" path="$3"
  if grep -qF "$needle" "$path" 2>/dev/null; then
    echo "  PASS  $desc"; (( PASS++ )) || true
  else
    echo "  FAIL  $desc (needle '$needle' not in $path)"
    (( FAIL++ )) || true
  fi
}

# Create an isolated git project for each test group
new_project() {
  local dir
  dir=$(mktemp -d)
  cd "$dir"
  git init -q
  git config user.email "test@specman"
  git config user.name "specman-test"
  echo "$dir"
}

cleanup() { rm -rf "$1"; }

# ─── Tests ────────────────────────────────────────────────────────────────────

echo ""
echo "=== specman init ==="
P=$(new_project)
cd "$P"
OUT=$("$SPECMAN" init 2>&1)
assert_file_exists "init creates .specman/identity/constitution.md" "$P/.specman/identity/constitution.md"
assert_file_exists "init creates .specman/identity/decision-heuristics.md" "$P/.specman/identity/decision-heuristics.md"
assert_file_exists "init creates .specman/identity/constraints.md" "$P/.specman/identity/constraints.md"
assert_file_exists "init creates .specman/meta/session-index.md" "$P/.specman/meta/session-index.md"
assert_file_exists "init creates .specman/patterns/general.md" "$P/.specman/patterns/general.md"
assert_file_exists "init creates CLAUDE.md" "$P/CLAUDE.md"
assert_file_exists "init creates .claude/settings.json" "$P/.claude/settings.json"
assert_file_contains "CLAUDE.md has specman block" "specman:begin" "$P/CLAUDE.md"
assert_file_contains "settings.json has stop hook" "_stop-hook" "$P/.claude/settings.json"
assert_contains "init output mentions Done" "Done" "$OUT"
cleanup "$P"

echo ""
echo "=== specman init --force ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
echo "extra line" >> "$P/CLAUDE.md"
"$SPECMAN" init --force >/dev/null 2>&1
COUNT=$(grep -c "specman:begin" "$P/CLAUDE.md" || true)
assert_eq "init --force does not duplicate specman block" "1" "$COUNT"
cleanup "$P"

echo ""
echo "=== specman session new / end ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
OUT=$("$SPECMAN" session new my-feature 2>&1)
assert_contains "session new reports file path" ".specman/sessions/" "$OUT"
SESSION_FILE=$(find "$P/.specman/sessions" -name '*.md' | head -1)
assert_file_exists "session file created" "$SESSION_FILE"
assert_file_contains "session has in-progress status" 'status: "in-progress"' "$SESSION_FILE"
assert_file_contains "session has correct slug" 'slug: "my-feature"' "$SESSION_FILE"
assert_file_exists "current-session pointer written" "$P/.claude/current-session"

OUT=$("$SPECMAN" session end 2>&1)
assert_contains "session end reports completion" "completed" "$OUT"
assert_file_contains "session marked completed" 'status: "completed"' "$SESSION_FILE"
assert_file_contains "session-index updated" "my-feature" "$P/.specman/meta/session-index.md"
[[ ! -f "$P/.claude/current-session" ]] && { echo "  PASS  current-session removed after end"; (( PASS++ )) || true; } \
  || { echo "  FAIL  current-session should be removed after end"; (( FAIL++ )) || true; }
cleanup "$P"

echo ""
echo "=== specman decision new ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
OUT=$("$SPECMAN" decision new use-postgres 2>&1)
assert_contains "decision new reports file" ".specman/decisions/" "$OUT"
DEC_FILE=$(find "$P/.specman/decisions" -name 'DEC-*.md' | head -1)
assert_file_exists "decision file created" "$DEC_FILE"
assert_file_contains "decision has DEC-001 id" 'id: "DEC-001"' "$DEC_FILE"
assert_file_contains "decision has correct slug" 'slug: "use-postgres"' "$DEC_FILE"

# Second decision gets DEC-002
"$SPECMAN" decision new add-redis >/dev/null 2>&1
DEC2=$(find "$P/.specman/decisions" -name 'DEC-002--*.md' | head -1)
assert_file_exists "second decision gets DEC-002" "$DEC2"
cleanup "$P"

echo ""
echo "=== specman feedback new ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
OUT=$("$SPECMAN" feedback new caching-works 2>&1)
assert_contains "feedback new reports file" ".specman/feedback/" "$OUT"
FB_FILE=$(find "$P/.specman/feedback" -name 'FB-*.md' | head -1)
assert_file_exists "feedback file created" "$FB_FILE"
assert_file_contains "feedback has FB-001 id" 'id: "FB-001"' "$FB_FILE"
assert_file_contains "feedback has correct slug" 'slug: "caching-works"' "$FB_FILE"
assert_file_contains "feedback has positive outcome" 'outcome: "positive"' "$FB_FILE"
cleanup "$P"

echo ""
echo "=== specman hooks ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1

OUT=$("$SPECMAN" hooks list 2>&1)
assert_contains "hooks list shows stop as enabled" "[enabled]" "$OUT"
assert_contains "hooks list shows session-start as disabled" "session-start" "$OUT"

"$SPECMAN" hooks enable session-start >/dev/null 2>&1
assert_file_contains "session-start hook written to settings" "_hook-session-start" "$P/.claude/settings.json"
OUT=$("$SPECMAN" hooks list 2>&1)
assert_contains "session-start now shows enabled" "[enabled]" "$OUT"

"$SPECMAN" hooks disable session-start >/dev/null 2>&1
OUT=$(grep -c "_hook-session-start" "$P/.claude/settings.json" || true)
assert_eq "session-start hook removed from settings" "0" "$OUT"

# enable idempotent
"$SPECMAN" hooks enable guard >/dev/null 2>&1
"$SPECMAN" hooks enable guard >/dev/null 2>&1
COUNT=$(grep -c "_hook-guard" "$P/.claude/settings.json" || true)
assert_eq "enabling same hook twice is idempotent" "1" "$COUNT"
cleanup "$P"

echo ""
echo "=== specman status ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
"$SPECMAN" session new status-test >/dev/null 2>&1
OUT=$("$SPECMAN" status 2>&1)
assert_contains "status shows location" ".specman" "$OUT"
assert_contains "status shows active session" "Active session:" "$OUT"
assert_contains "status shows Sessions count" "Sessions:" "$OUT"
cleanup "$P"

echo ""
echo "=== specman eject ==="
P=$(new_project)
cd "$P"
"$SPECMAN" init >/dev/null 2>&1
"$SPECMAN" eject >/dev/null 2>&1
[[ ! -d "$P/.specman" ]] && { echo "  PASS  eject removes .specman/"; (( PASS++ )) || true; } \
  || { echo "  FAIL  .specman/ should be gone after eject"; (( FAIL++ )) || true; }
if [[ -f "$P/CLAUDE.md" ]]; then
  assert_eq "eject removes specman block from CLAUDE.md" "0" "$(grep -c 'specman:begin' "$P/CLAUDE.md" || true)"
fi
cleanup "$P"

echo ""
echo "=== error handling ==="
P=$(new_project)
cd "$P"
# Commands that need KB without init should fail gracefully
OUT=$("$SPECMAN" session new foo 2>&1 || true)
assert_contains "session new without init prints error" "error:" "$OUT"
OUT=$("$SPECMAN" decision new foo 2>&1 || true)
assert_contains "decision new without init prints error" "error:" "$OUT"
cleanup "$P"

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo "────────────────────────────────────────"
echo ""

[[ $FAIL -eq 0 ]]
