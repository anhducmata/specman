# Query Gateway — Open Questions

---

## OQ-001: SQL Caching for Repeated Queries

**Question:** The README notes that SQL string caching could be added if CPU profiling shows it's needed. Has profiling been done? Is the sidecar a bottleneck at current query volumes?

**Status:** Open — no profiling data yet.

---

## OQ-002: sidecar Worker Count Tuning

**Question:** Sidecar runs with `uvicorn --workers 4`. Is this tuned to ECS task CPU allocation? What happens under burst load?

**Status:** Open — needs load testing.

---

## OQ-003: Domain Auto-Expansion Risk

**Question:** New projects added to an existing domain automatically become visible to users with domain grants. This is documented as intentional to reduce admin overhead. But it means a new sensitive dataset joined to `oncology` is immediately accessible to all `oncology` grant holders without explicit approval.

**Why it matters:** A data breach path exists if domain membership is not tightly controlled.

**Status:** Open — needs a governance policy for adding projects to domains.
