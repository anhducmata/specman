---
version: "1.0.0"
last_updated: "2026-05-21"
updated_by_feedback: []
---

# Decision Heuristics

Mutable. Grows from feedback. Every rule is traceable to a decision or feedback file.

## General
- H-GEN-01: Before adding a new pattern, check if one already exists here
- H-GEN-02: Prefer reversible actions. Confirm before irreversible ones.
- H-GEN-03: Acknowledge uncertainty. Never present a guess as fact.

## Cost
- H-COST-01: Always cache Tier 1 (.specman/identity/) with prompt caching
- H-COST-02: Retrieve top-3 relevant sessions only — never load all history
- H-COST-03: Compress session bodies at task completion (~200 tokens)

## Confidence Table
| Heuristic | Evidence | Last Validated |
|-----------|----------|----------------|
| H-GEN-01  | 0        | 2026-05-21     |
| H-GEN-02  | 0        | 2026-05-21     |
| H-GEN-03  | 0        | 2026-05-21     |
| H-COST-01 | 0        | 2026-05-21     |
