# Permission Service — Gotchas

Learned sharp edges and non-obvious behaviors. High-value for avoiding repeated mistakes.

---

## Cache Invalidation After Manual DB Changes

**Gotcha:** If you modify permissions directly in the database (bypassing the Admin API), the cache is NOT automatically invalidated.

**Fix:** Manually bump the version:
```sql
UPDATE users SET data_version = data_version + 1 WHERE id = 'user-123';
```
Forgetting this means stale permissions persist until TTL expires.

---

## Casbin Rule Changes Need Policy Version Bump

**Gotcha:** Casbin model changes applied via the Admin API trigger a hot-reload AND a `policy_version` bump automatically. But if you edit the `casbin_rule` table directly in Postgres, the in-memory engine is not reloaded.

**Fix:** Always use the Admin API for Casbin changes. If manual DB edit was necessary, call the reload endpoint and bump `policy_version`.

---

## Suspended User Cache

**Gotcha:** Suspending a user in the DB does NOT immediately take effect if a valid cache entry exists. The `uv` (user version) must be bumped.

**Fix:** When suspending a user, always increment `data_version` (or `user_version`) in the same transaction.

---

## Batch Check Partial Hits

**Gotcha:** `POST /check-permissions` returns `cache_hits` and `cache_misses` in the response. A partial hit means some items were served from cache and some from DB. If you're testing policy changes, don't trust a response with `cache_hits > 0` until you've invalidated the cache.

---

## /ready Does Not Check Casbin

**Gotcha:** `GET /ready` pings Postgres and Redis but does NOT verify that Casbin policies loaded correctly. A service can return 200/ready while having an empty or malformed policy set.

**Implication:** After a policy migration, verify with a real permission check, not just `/ready`.
