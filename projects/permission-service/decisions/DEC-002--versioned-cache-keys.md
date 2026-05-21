---
id: "DEC-002"
date: "2026-05-21"
status: "accepted"
superseded_by: null
projects: ["permission-service"]
sessions: []
feedback: []
tags: ["caching", "architecture", "performance", "redis"]
---

# DEC-002: Versioned Cache Keys for Permission Invalidation

## Context

Permission check results are cached in Redis to reduce Postgres load. Cache invalidation must be instant — a revoked user must not continue to have access after revocation. Two approaches exist.

## Options Considered

### Option A: Versioned Keys (Chosen)

Cache key includes version numbers for user, app, policy, and data:
```
permctx:{user_id}:{app}:{feature}:{action}:{uv}:{av}:{pv}:{dv}
```
Invalidation = bump the relevant version in Postgres. Next request generates a new key (cache miss), fetches fresh data, repopulates. Old keys expire via TTL.

- **Pros:** Instant invalidation. No distributed coordination. No active purge needed. Atomic — version bump and data update happen in the same DB transaction.
- **Cons:** Old keys accumulate in Redis until TTL expiry. Redis memory usage is slightly higher.

### Option B: Active Cache Purge (Rejected)

On permission change, explicitly delete the affected cache keys from Redis.

- **Pros:** No key accumulation.
- **Cons:** Requires distributed coordination between the DB write and the Redis delete. Race conditions if a new cache entry is written between the delete and the DB commit. Complex to implement correctly at scale.

## Decision

Versioned keys. Invalidation by version bump, not active purge.

## Rationale

Active purge is complex and prone to race conditions in distributed systems. Versioned keys make invalidation atomic (same DB transaction as the data change) and require no coordination across services. The slight Redis memory overhead from expired keys is acceptable.

## Consequences

- Manual DB changes to permissions must be accompanied by a version bump, or the cache will serve stale data until TTL expiry.
- Redis memory should be monitored for unexpected growth if TTL is too long.
- `CACHE_TTL_SECONDS` must be tuned — too long means stale data persists unnecessarily; too short means Redis is not effective.

## Review Trigger

If Redis memory becomes a bottleneck or if version bump logic is frequently missed during manual DB operations, revisit.
