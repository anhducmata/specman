# Permission Service — Open Questions

Unresolved design problems. Persists across sessions.
When a question is resolved, move the answer to `architecture.md` and remove it here.

---

## OQ-001: Break-Glass Access Auditing

**Question:** Break-glass "admin" roles are documented as possible. Is there a dedicated audit flag or report for break-glass usage, or does it get mixed into regular audit logs?

**Why it matters:** Compliance teams need to easily identify and review break-glass access events separately from normal access.

**Status:** Open — needs design decision if break-glass roles are ever implemented.

---

## OQ-002: Cache TTL Tuning

**Question:** `CACHE_TTL_SECONDS` defaults to 60. Has this been measured against actual permission change frequency? What is the acceptable staleness window?

**Why it matters:** Too long = stale permissions persist. Too short = Redis stampede risk under load.

**Status:** Open — no production data yet.

---

## OQ-003: Column Masking Scope

**Question:** Column-level masking is applied based on `block`/`mask` flags. Is there a mechanism to mask different values depending on the user's role (e.g., partial mask for analysts, full mask for unverified users)?

**Status:** Open — current implementation appears binary (mask or don't).
