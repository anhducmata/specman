# Commander KB — Bootstrap

This repo is an AI knowledge base. Load it at the start of every session.

## Phase 1 — Always Load (Tier 1, ~3K tokens) — CACHE THIS PREFIX

```
identity/constitution.md
identity/decision-heuristics.md
identity/constraints.md
```

Place a prompt cache breakpoint after these three files.
Cost impact: 90% reduction on Tier 1 tokens across repeated sessions.

## Phase 2 — Retrieve by Project (Tier 2, ≤ 3 files)

Score candidates: `score = 0.6×relevance + 0.25×recency + 0.15×importance`

Always retrieve:
- `projects/{current-project}/gotchas.md`

If unfamiliar with project:
- `projects/{current-project}/overview.md`
- `projects/{current-project}/architecture.md`

If architecture decision involved — top-2 by tag match:
- `decisions/DEC-NNN--*.md`

For security/auth work:
- `patterns/security-patterns.md`

## Phase 3 — Recent Sessions (Tier 3, ≤ 3 sessions)

1. Open `meta/session-index.md`
2. Filter by current project + last 30 days
3. Load top-3 by score formula above

## Token Budget

| Tier | Tokens | When |
|------|--------|------|
| 1 — Core | ~3K | Always |
| 2 — Semantic | ~2K | Selective |
| 3 — Episodic | ~2K | Selective |
| **Total** | **≤8K** | **Target** |

## Session Workflow

```bash
# Start of session
commander session new <slug> [project1 project2 ...]

# End of session (Stop hook auto-runs this if you forget)
commander session end
```

## Key Rules

- Always cache Tier 1 prefix (see `ai-systems/claude.md` for API snippet)
- Compress session body before ending: `commander compress`
- Never rewrite git history — it is the RL audit trail
- Significant decisions → `commander decision new <slug>`
- Observed outcomes → `commander feedback new <slug>`
