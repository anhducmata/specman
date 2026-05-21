# Security Patterns

Distilled cross-session security learnings. Promoted from feedback records.

---

## P-SEC-01: Always Fail Closed at Every Layer

Permission checks at the service layer, the gateway layer, and the cache layer should all default to DENY on error or ambiguity. A single fail-open layer in the chain undermines the entire stack.

**Source:** DEC-001, README design principles.

---

## P-SEC-02: Audit Before You Automate

Before automating any access control change, ensure the audit log captures it. Automated changes that bypass audit trails are compliance violations.

---

## P-SEC-03: AST-Level Security, Not String-Level

SQL security filters must be injected at AST node level. String concatenation or regex-based injection is bypassable via SQL nesting (`UNION`, `WITH`, `HAVING`). Always use a proper SQL parser.

**Source:** Query Gateway architecture, DEC (pending).

---

## P-SEC-04: Version Bump on Every Permission Change

Any change to a user's permissions, roles, or data grants must be accompanied by a version bump in the versioned cache key. This is the invalidation mechanism — skipping the bump causes stale permissions to persist.

**Source:** DEC-002.
