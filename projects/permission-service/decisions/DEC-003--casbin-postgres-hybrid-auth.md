---
id: "DEC-003"
date: "2026-05-21"
status: "accepted"
superseded_by: null
projects: ["permission-service"]
sessions: []
feedback: []
tags: ["architecture", "casbin", "postgres", "auth", "rbac"]
---

# DEC-003: Casbin + Postgres Hybrid Auth (Functional vs. Data)

## Context

The permission service needs to handle two distinct types of authorization:
1. **Functional auth**: Can this role perform this action on this app? (e.g., "analysts can query")
2. **Data auth**: Which specific domains, projects, tables, columns can this user access?

## Options Considered

### Option A: Hybrid — Casbin for Functional, Postgres for Data (Chosen)

- Casbin RBAC handles static role-to-action mappings
- Postgres tables handle dynamic, per-user data grants

- **Pros:** Each tool used for what it does best. Casbin is excellent at evaluating RBAC policies fast. Postgres is excellent at querying millions of dynamic, normalized records.
- **Cons:** Two systems to maintain. Cross-system queries are more complex.

### Option B: Casbin Only (Rejected)

Encode all data grants as Casbin policies.

- **Pros:** Single system.
- **Cons:** Managing millions of dynamic per-user data grants in Casbin creates performance bottlenecks. Casbin policies are not normalized — querying "which users have access to domain X?" becomes a full policy scan.

### Option C: Postgres Only (Rejected)

Encode all RBAC rules as Postgres queries.

- **Pros:** Single system.
- **Cons:** Casbin's RBAC evaluation engine (with hot-reload, role inheritance, wildcards) would need to be reimplemented in SQL or application code. High complexity, high bug risk.

## Decision

Hybrid: Casbin for functional auth, Postgres for data scope.

## Rationale

Separation of concerns at the data model level. Functional rules (role → action) are static and well-suited to Casbin's policy engine. Data grants (user → domain → project → table → column) are dynamic, per-user, and must be queryable — well-suited to normalized Postgres tables. Combining them in either single system creates management complexity that outweighs the simplicity of a single system.

## Consequences

- A permission evaluation requires: (1) Casbin check for functional access, (2) Postgres query for data scope — two I/O operations per cache miss.
- Both systems must be kept consistent. A user with a Casbin role but no data grants gets functional access but no data — a valid partial state.
- Casbin rule changes and data grant changes have separate invalidation paths (policy_version vs. data_version).

## Review Trigger

If Casbin becomes a performance bottleneck at scale, or if the two-system consistency management becomes error-prone, evaluate consolidation.
