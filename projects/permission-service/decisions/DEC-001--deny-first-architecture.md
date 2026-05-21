---
id: "DEC-001"
date: "2026-05-21"
status: "accepted"
superseded_by: null
projects: ["permission-service", "query-gateway"]
sessions: []
feedback: []
tags: ["security", "architecture", "fail-closed"]
---

# DEC-001: Deny-First, Fail-Closed Architecture

## Context

The permission service must make a decision when infrastructure fails (network error to Postgres, Casbin parse failure, missing user record). Two options exist: fail open (grant access) or fail closed (deny access). This is a foundational security decision.

## Options Considered

### Option A: Deny-First, Fail-Closed (Chosen)

Any error or ambiguity → DENY. Explicit grants required for every access.

- **Pros:** Infrastructure failures do not expose sensitive biomedical data. Consistent, auditable behavior. Regulatory compliance (GDPR, HIPAA, PDPA) is easier to prove.
- **Cons:** Legitimate users may be temporarily blocked during infrastructure incidents.

### Option B: Fail-Open (Rejected)

Errors → ALLOW. Deny only explicit blocks.

- **Pros:** Higher availability during incidents.
- **Cons:** A network blip could expose patient data to unauthorized users. Unacceptable in a biomedical data governance context.

## Decision

Deny-first, fail-closed. Any error, missing rule, or ambiguous state resolves to DENY.

## Rationale

Security is paramount in authorization systems managing biomedical data. Regulatory requirements (GDPR, HIPAA, PDPA) require that access be explicitly granted, not implicitly inherited. Temporary access denial during an incident is recoverable; data exposure is not.

## Consequences

- Engineers must ensure explicit grants exist before users can access data. "Works on my machine" failures in dev are often missing grants, not bugs.
- Incident response for infrastructure failures may temporarily block legitimate users. This is acceptable and expected.
- All grant management must be tested to ensure grants are correctly created, not just that access is allowed.

## Review Trigger

If fail-closed behavior causes significant user impact (>1% of legitimate requests denied due to infrastructure issues over a 30-day period), revisit with circuit-breaker patterns or grace periods.
