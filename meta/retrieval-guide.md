# Retrieval Guide — How to Load This KB Cheaply

This document tells any AI exactly what to load and when, to stay within the token budget.

**Target: ≤8K tokens total context per routine session.**

---

## Scoring Formula for Retrieval

When selecting which files to retrieve from Tier 2 and Tier 3, score candidates by:

```
score = 0.6 × relevance + 0.25 × recency + 0.15 × importance
```

- **relevance:** keyword/semantic match to current task description
- **recency:** how recently was this file updated (newer = higher)
- **importance:** manually assigned weight (gotchas.md > open-questions.md > architecture.md for debugging; reverse for new feature work)

Select greedily by score until token budget for the tier is exhausted.

---

## Phase 1 — Always Load (Tier 1, ~3K tokens)

Mark this entire block for prompt caching. It is stable and rarely changes.

```
identity/constitution.md
identity/decision-heuristics.md
identity/constraints.md
```

**Cache breakpoint:** Place the cache marker after loading these three files.

---

## Phase 2 — Retrieve by Project (Tier 2, select ≤ 3 files, ~2K tokens)

```
Mandatory:
  projects/{relevant-project}/gotchas.md

Conditional:
  projects/{relevant-project}/overview.md         → if AI is not familiar with the project
  projects/{relevant-project}/architecture.md     → if session involves architecture decisions
  projects/{relevant-project}/open-questions.md   → if session is exploratory or planning

Decisions (top-2 by tag match):
  decisions/DEC-NNN--*.md                         → filter by tags matching current task

Patterns:
  patterns/security-patterns.md                   → always for auth/permission work
  patterns/go-service-patterns.md                 → for Go code changes
  patterns/cross-project.md                       → for cross-service work
```

---

## Phase 3 — Retrieve Recent History (Tier 3, ≤ 3 sessions, ~2K tokens)

```
1. Open meta/session-index.md
2. Filter by: projects includes current project AND date within last 30 days
3. Score by formula above
4. Load top-3 session files
5. If any loaded session references a feedback/ file, load that feedback file too
```

---

## Phase 4 — Retrieve Examples (Optional, ~1K tokens)

Only load if uncertain about the correct approach:

```
preferred-examples/
  Filter by: projects includes current project OR tags overlap
  Score by semantic similarity to current task description
  Load top-2
```

---

## Token Budget Table

| Phase | Content | Max Tokens | When |
|---|---|---|---|
| 1 — Core | identity/ (3 files) | ~3,000 | Always |
| 2 — Semantic | projects/, decisions/, patterns/ | ~2,000 | Selective |
| 3 — Episodic | sessions/, feedback/ | ~2,000 | Selective |
| 4 — Examples | preferred-examples/ | ~1,000 | Optional |
| **Total** | | **≤8,000** | |

---

## What NOT to Load

- Full project READMEs (use seeded `projects/` files instead — they are already condensed)
- All sessions for a project (use the index + top-3 scoring)
- All decisions (use tag matching)
- identity/changelog.md (only needed when writing a heuristic update)
