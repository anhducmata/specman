# Codex — Configuration & Notes

Placeholder for Codex-specific context, prompt strategies, and known behaviors for this codebase.

---

## Status

Not yet in use. Fill this file when Codex is integrated into the workflow.

## Fields to Document

- Context window size and caching support
- Effective prompt patterns for Go code in this codebase
- Known failure modes or quirks
- Model routing recommendation (which tasks to delegate to Codex vs. Claude)

## System Prompt Template

Codex has no hook system. Paste this block at the start of every Codex session:

---
You are working in a project with a Commander knowledge base.
Before starting, read these files in order:
1. identity/constitution.md
2. identity/decision-heuristics.md
3. identity/constraints.md
4. projects/{current-project}/gotchas.md
5. (optional) last 3 sessions from meta/session-index.md

At session start, run: commander session new <slug> <project>
At session end, run:   commander session end
---
