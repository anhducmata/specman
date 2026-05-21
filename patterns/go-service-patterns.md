# Go Service Patterns

Conventions used in permission-service and query-gateway.

---

## P-GO-01: Dependency Injection in Handlers

All handlers receive dependencies (DB, cache, policy engine) via constructor injection. Never instantiate dependencies inside handlers. This enables full mocking in unit tests.

---

## P-GO-02: Batch Over Concurrency

Prefer batch endpoints (`POST /check-permissions`) over parallel individual calls. Redis MGET in a single pipeline is faster than N concurrent SGET calls. Add batch support before adding concurrency primitives.

---

## P-GO-03: HTTP Body Size Limits

All HTTP handlers enforce strict request body size limits. Oversized requests are rejected before parsing. This prevents memory exhaustion attacks.

---

## P-GO-04: Sanitize Error Messages at the Boundary

Internal errors (DB errors, parser details, policy engine messages) are logged to CloudWatch but never returned to the client. Client-facing errors are sanitized to remove internal implementation details.

---

## P-GO-05: TDD with Containerized Tests

Tests are containerized and run in Go 1.23 containers in CI/CD. This ensures environment consistency and prevents "works on my machine" failures. All new handlers require integration tests before merge.
