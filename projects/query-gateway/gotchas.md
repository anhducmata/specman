# Query Gateway — Gotchas

---

## Sidecar Must Be Running for Local Dev

**Gotcha:** The Go gateway calls the Python sidecar over HTTP at `localhost:8000`. If the sidecar is not running, every query returns 503. This trips up new developers who run just `go run main.go`.

**Fix:** Always start the sidecar first:
```bash
cd sql-parser-sidecar && python main.py
```
Or use `./start.sh` which handles both via Docker.

---

## Trino Dialect — Not Standard SQL

**Gotcha:** The sidecar parses with `read="trino"`. Standard SQL that works in Postgres may fail AST parsing if it uses Trino-incompatible syntax. The parser will return 400, not a rewrite error.

**Implication:** When writing test queries, use Trino syntax, not generic ANSI SQL.

---

## View Queries Still Need Domain Column

**Gotcha:** Athena Views are treated as table identifiers. RLS is injected as `WHERE domain='x'` on the view. If the view does not expose a `domain` column, the query will fail at Athena execution time — not at the gateway.

**Fix:** All views that are queryable through the Gateway must expose a `domain` column.

---

## Permission Cache TTL Is 30s

**Gotcha:** `PERMISSION_CACHE_TTL=30` caches permission checks in the Gateway's in-memory store. A user whose permissions were just revoked can still succeed for up to 30 seconds.

**Implication:** For security-critical revocations, 30s staleness may be unacceptable. Consider reducing TTL or calling the permission service directly for high-risk operations.

---

## Error Messages Are Sanitized

**Gotcha:** Internal errors (parser details, SQL AST content) are never returned to the client. The response is always a clean user-facing message. If debugging a 500, look at CloudWatch logs, not the client response body.
