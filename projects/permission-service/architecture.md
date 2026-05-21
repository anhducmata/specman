# Permission Service — Architecture

## Core Design: Hybrid Auth (Casbin + Postgres)

**Functional auth** (what can you do) → Casbin RBAC
**Data auth** (where can you do it) → PostgreSQL data grants

**Why hybrid:** Casbin is excellent for static role-to-action mappings. Managing millions of dynamic per-user data grants (specific projects, tables) entirely in Casbin creates bottlenecks and management complexity. Offloading data scope to normalized Postgres tables ensures scalable, queryable grants. See DEC-003.

---

## Cache Architecture: Versioned Keys

```
permctx:{user_id}:{app}:{feature}:{action}:{uv}:{av}:{pv}:{dv}
```

- `uv` — user version (bumps on suspension/activation)
- `av` — app version (bumps on app toggle)
- `pv` — policy version (bumps on Casbin rule changes)
- `dv` — data version (bumps on grant changes)

**Invalidation:** Bump the relevant version in Postgres. The next request generates a new key (cache miss), fetches fresh data, repopulates. Old keys expire via TTL. **No active purge needed.** See DEC-002.

**Manual invalidation:**
```sql
-- Invalidate specific user's data scope
UPDATE users SET data_version = data_version + 1 WHERE id = 'user-123';

-- Invalidate ALL functional policies
UPDATE policy_versions SET policy_version = policy_version + 1 WHERE id = 1;
```

---

## Fail-Closed (Deny-First)

Any error (network failure to Postgres, Casbin parse error, missing user record) → **DENY**.
Explicit rules must exist to grant access. Infrastructure failures do not leak data. See DEC-001.

---

## Batch Evaluation

`POST /check-permissions` accepts an array of items. Internally:
1. Redis pipeline (MGET) checks all keys in one round trip
2. Cache hits resolved immediately
3. Cache misses aggregated and fetched optimally
4. Result: drastically fewer network roundtrips between Query Gateway and Permission Service

---

## Request Flow

```
Client → POST /check-permissions
  → Handler
    → Redis MGET (cache lookup)
    → [cache miss] → Casbin eval + Postgres data scope
    → [result] → Redis SET with versioned key
  → Response: allowed/denied + role + data_scope
```

---

## Observability

- **Distributed tracing:** `X-Request-ID` header propagated to all downstream calls, logged in all services
- **Audit logs:** Immutable, in Postgres — every check logged with user, action, scope, timestamp, decision
- **Operational logs:** stdout → CloudWatch `/ecs/permission-service`
- **Dashboards:** CPU/memory, GC pause, HTTP latency, 4xx/5xx rates, Casbin success/failure rates
