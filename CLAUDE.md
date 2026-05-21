# specman
<!-- specman:begin -->
## specman KB

This project has a knowledge base at `.specman/`.
Load it at the start of every session.

### Tier 1 — Always load (cache this prefix)
`.specman/identity/constitution.md`
`.specman/identity/decision-heuristics.md`
`.specman/identity/constraints.md`

### Tier 2 — Retrieve by task (≤3 files, score: 0.6×relevance+0.25×recency+0.15×importance)
`.specman/decisions/` — top-2 matching current topic
`.specman/patterns/` — if cross-cutting

### Tier 3 — Recent sessions (top-3 from .specman/meta/session-index.md)

### Commands
```bash
sb session new <slug>     # start session
sb session end            # end session (Stop hook auto-runs on Claude exit)
sb decision new <slug>    # log a decision
sb feedback new <slug>    # log an outcome
```
<!-- specman:end -->
