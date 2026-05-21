# Query Gateway — Architecture

## Why Python Sidecar Instead of Go Parser

Target DB is AWS Athena (Trino/Presto engine). Trino-specific syntax (`UNNEST`, `ARRAY`, Window Functions, `""` quotes) is rejected by Go-native parsers like Vitess (MySQL-oriented). The Go ecosystem has no mature Trino parser. Python's `sqlglot` supports 20+ dialects including Trino, with high-level AST rewriting APIs. The sidecar adds ~10ms latency — negligible for analytical queries that run seconds to minutes. See DEC-004 (if created).

## Why Not AWS Lake Formation

Avoiding vendor lock-in and maintaining a single source of truth. Lake Formation would require constant sync between the internal Permission Service (Casbin/Postgres) and AWS IAM + Lake Formation Data Filters. The Query Gateway is the Policy Enforcement Point — vendor-agnostic.

## SQL Security: AST Node Replacement (Not String Append)

**Wrong approach:** Appending `WHERE domain='x'` to the SQL string — bypassable via `UNION`, `HAVING`, `WITH` clauses.

**Correct approach:** AST node replacement. The sidecar locates the exact table node in the AST and wraps it:
```sql
-- Original
SELECT * FROM microbiome

-- Rewritten (RLS injected at source)
SELECT * FROM (SELECT * FROM microbiome WHERE domain = 'oncology') AS microbiome
```

RLS is pushed down to the absolute source — impossible to bypass via SQL nesting. SQL injection proof (no string concatenation).

## Column-Level Security

The sidecar traverses `SELECT` projections. Masked columns → literal replacement:
```sql
-- Original
SELECT patient_name, age FROM samples

-- Masked
SELECT '***' AS patient_name, age FROM samples
```
Blocked columns → HTTP 403, entire query rejected.

## Two-Phase Processing (Extract then Rewrite)

1. **Extract phase** (`/extract`): fast table name extraction — no rewriting
2. **Permission check** in Go: verify user has access to ALL extracted tables in the requested domain
3. **Rewrite phase** (`/rewrite`): inject RLS filters — only runs if permission check passes

**Why separate phases:** Fast-failing. If permission is denied, no CPU wasted on complex AST transformation.

## Logging Separation

| Log type | Location | Retention | Audience |
|---|---|---|---|
| Operational | stdout → CloudWatch `/ecs/query-gateway` | 7–30 days | Engineers |
| Audit | Postgres (Permission Service) | Years | Security/Legal |

Security events logged with `SECURITY` prefix for easy alerting:
```
[ReqID: abc] SECURITY blocked_column=email table=samples user=user-123
[ReqID: abc] SECURITY denied_domain=oncology user=user-456
```

## Distributed Tracing

Every request gets an `X-Request-ID` UUID (generated or from client header). Propagated via `http.RoundTripper` interceptor to Permission Service and Python sidecar. One ID traces a request across all three services in CloudWatch Insights.
