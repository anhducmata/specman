# Cross-Project Patterns

Patterns observed across permission-service, query-gateway, and goauthentik.

---

## P-CROSS-01: SSM Parameter Store for All Secrets

All three services store secrets in AWS SSM Parameter Store as `SecureString`. Services pull secrets at runtime. Nothing is hardcoded in task definitions, environment files, or source code.

**Implication:** When adding a new secret to any service, the SSM path convention must be followed and the ECS task role must have `ssm:GetParameter` permission for that path.

---

## P-CROSS-02: GitHub Actions OIDC for CI/CD

All deployments use OIDC to assume an IAM role — no long-lived AWS credentials stored in GitHub Secrets. Only the Pulumi passphrase is a GitHub Secret.

**Implication:** New services added to this platform should follow the same OIDC pattern. Do not add `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` to GitHub Secrets.

---

## P-CROSS-03: X-Request-ID for Distributed Tracing

All services accept and propagate `X-Request-ID`. A single ID traces a request across Gateway → Permission Service → SQL Sidecar in CloudWatch Insights.

**Implication:** Any new service added to this platform must: (1) accept `X-Request-ID` from upstream, (2) forward it to all downstream calls, (3) log it on every log line.

---

## P-CROSS-04: Stateless Services, State in Managed Infrastructure

All application services (Go Gateway, Go Permission Service, Python Sidecar) are stateless. State lives in Postgres, Redis, and SSM. This enables horizontal scaling without coordination.

**Implication:** Never introduce in-process mutable state that must be shared across instances. If shared state is needed, add it to Postgres or Redis.
