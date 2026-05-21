---
version: "1.0.0"
last_updated: "2026-05-21"
updated_by_feedback: []
---

# Commander Decision Heuristics

**Procedural memory.** This file is MUTABLE — it evolves based on feedback.
See `identity/changelog.md` for the history of every change.
Every heuristic is traceable: heuristic → changelog entry → feedback file → session → reasoning trace.

---

## Security Heuristics

- **H-SEC-01**: Default deny. Any ambiguous permission request resolves to DENY. Explicit grants required.
- **H-SEC-02**: Never suggest removing or bypassing audit log writes, even for performance gains.
- **H-SEC-03**: Column-level masking takes priority over query performance optimizations.
- **H-SEC-04**: All permission changes must go through the versioned cache key mechanism — never use active purge.
- **H-SEC-05**: Service accounts follow least privilege. Assign only the minimum scope needed, never reuse human roles.

## Architecture Heuristics

- **H-ARCH-01**: Prefer versioned cache keys over active cache purging for invalidation. Versioned keys are instant, atomic, and require no coordination.
- **H-ARCH-02**: Separate functional auth (what can you do) from data auth (where can you do it). Do not conflate them in Casbin.
- **H-ARCH-03**: Batch endpoints before adding concurrency complexity. `POST /check-permissions` is the right pattern.
- **H-ARCH-04**: SQL security filters must be injected at AST node level, never via string concatenation or regex. AST injection is SQL-injection-proof.
- **H-ARCH-05**: The Python sidecar is stateless. Keep it that way — no DB connections, no in-memory state between requests.

## Code Quality Heuristics

- **H-CODE-01**: All new permission handlers require an integration test before merge.
- **H-CODE-02**: Casbin model changes require a written migration plan for existing rules before implementation.
- **H-CODE-03**: Go handlers use Dependency Injection. Never instantiate dependencies inside handlers.
- **H-CODE-04**: Error messages returned to clients must be sanitized. Never leak internal parser details, SQL structure, or stack traces.

## Process Heuristics

- **H-PROC-01**: If a decision affects more than one service, write a `DEC-NNN` file before writing code.
- **H-PROC-02**: Open questions in `projects/{service}/open-questions.md` older than 3 sessions without progress become a DEC candidate.
- **H-PROC-03**: Infrastructure changes (SST, Pulumi) require a human review step before deployment to prod.

## Cost Heuristics

- **H-COST-01**: Route formatting, summarization, and classification tasks to cheaper models (Haiku-class). Reserve flagship models for complex reasoning and final decisions.
- **H-COST-02**: Never inject the full session history into context. Retrieve top-3 relevant sessions only, using the scoring formula in `meta/retrieval-guide.md`.
- **H-COST-03**: Mark Tier 1 (`identity/`) for prompt caching in every session. This prefix is stable and cache-eligible.
- **H-COST-04**: Compress session bodies to ~200 tokens at task completion. Full reasoning traces live in git history.
- **H-COST-05**: Never load a full project README into context if a seeded `projects/{service}/overview.md` exists.

---

## Confidence Table

| Heuristic  | Evidence Count | Last Validated | Source         |
|------------|---------------|----------------|----------------|
| H-SEC-01   | 12 (README)   | 2026-05-21     | Seeded         |
| H-SEC-02   | 8 (README)    | 2026-05-21     | Seeded         |
| H-SEC-03   | 3 (README)    | 2026-05-21     | Seeded         |
| H-SEC-04   | 5 (README)    | 2026-05-21     | Seeded         |
| H-SEC-05   | 2 (README)    | 2026-05-21     | Seeded         |
| H-ARCH-01  | 6 (README)    | 2026-05-21     | Seeded         |
| H-ARCH-02  | 4 (README)    | 2026-05-21     | Seeded         |
| H-ARCH-03  | 2 (README)    | 2026-05-21     | Seeded         |
| H-ARCH-04  | 3 (README)    | 2026-05-21     | Seeded         |
| H-ARCH-05  | 2 (README)    | 2026-05-21     | Seeded         |
| H-CODE-01  | 2 (README)    | 2026-05-21     | Seeded         |
| H-CODE-02  | 1 (README)    | 2026-05-21     | Seeded         |
| H-CODE-03  | 2 (README)    | 2026-05-21     | Seeded         |
| H-CODE-04  | 2 (README)    | 2026-05-21     | Seeded         |
| H-PROC-01  | 0             | 2026-05-21     | Initial        |
| H-PROC-02  | 0             | 2026-05-21     | Initial        |
| H-PROC-03  | 0             | 2026-05-21     | Initial        |
| H-COST-01  | 0             | 2026-05-21     | Research       |
| H-COST-02  | 0             | 2026-05-21     | Research       |
| H-COST-03  | 0             | 2026-05-21     | Research       |
| H-COST-04  | 0             | 2026-05-21     | Research       |
| H-COST-05  | 0             | 2026-05-21     | Research       |
