# Retrieval Guide

Score: `0.6×relevance + 0.25×recency + 0.15×importance`

## Always load (Tier 1 — cache this)
.specman/identity/constitution.md
.specman/identity/decision-heuristics.md
.specman/identity/constraints.md

## Retrieve by task (Tier 2, ≤3 files)
.specman/decisions/   top-2 by tag match
.specman/patterns/    if cross-cutting concern

## Recent history (Tier 3, ≤3 sessions)
Scan .specman/meta/session-index.md, load top-3 by score.

Token budget: Tier1 ~3K + Tier2 ~2K + Tier3 ~2K = ≤8K total
