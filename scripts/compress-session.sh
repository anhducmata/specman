#!/usr/bin/env bash
# Compress a completed session body to ~200 tokens.
# The full content is preserved in git history.
# Usage: compress-session.sh <path-to-session-file>

set -e

session_file=$1

if [[ -z "$session_file" || ! -f "$session_file" ]]; then
  echo "Usage: compress-session.sh <path-to-session-file>"
  exit 1
fi

echo "Session compression is a manual step."
echo ""
echo "To compress $session_file:"
echo ""
echo "1. Keep the frontmatter (---...---) unchanged."
echo "2. Replace the body with a 3-5 bullet summary (~200 tokens):"
echo ""
echo "   ## Summary (compressed)"
echo "   - Goal: [one sentence]"
echo "   - Key decisions: [list DEC refs or inline decisions]"
echo "   - Outcome: [positive/negative/mixed + one sentence]"
echo "   - Lessons: [1-2 key learnings]"
echo "   - See git history for full reasoning trace."
echo ""
echo "3. Run: git add $session_file && git commit -m 'session: compress $(basename $session_file .md)'"
echo ""
echo "The full session content remains in git history at the previous commit."
