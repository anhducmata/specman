# Claude — Configuration & Prompt Strategy

---

## Prompt Caching (Cost Optimization)

Cache Tier 1 at the start of every session. This is the highest-leverage cost optimization available.

**How:** In the Claude API messages array, mark the cache breakpoint after loading `identity/decision-heuristics.md`:

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": open("identity/constitution.md").read()
                    + "\n\n"
                    + open("identity/decision-heuristics.md").read()
                    + "\n\n"
                    + open("identity/constraints.md").read(),
                "cache_control": {"type": "ephemeral"}  # marks cache breakpoint
            },
            {
                "type": "text",
                "text": "[Tier 2 + 3 content retrieved for this session]"
            }
        ]
    }
]
```

**Expected savings:**
- Cache hit = 0.1× input token price
- 90% cost reduction on the Tier 1 prefix across repeated sessions
- Cache TTL: 5 minutes (default). For sessions > 5 min, re-send the cached prefix to refresh the TTL.

---

## Model Routing

| Task type | Recommended model |
|---|---|
| Formatting, summarization, classification | claude-haiku-4-5 |
| Multi-step reasoning, code review, retrieval synthesis | claude-sonnet-4-6 |
| Complex architectural decisions, final DEC files | claude-opus-4-7 |

Route to the cheapest model that handles the task reliably.

---

## Context Window Strategy

- **Target:** ≤8K tokens total context per session (see `meta/retrieval-guide.md`)
- **Never:** Load full project READMEs — use seeded `projects/` files instead
- **Compress:** Session bodies at task completion (run `scripts/compress-session.sh`)
- **Session files:** Write reasoning trace inline as you work — commit at start and end

---

## Known Effective Patterns for This Codebase

- When asking about permission logic, always specify: user, action, app, domain/project scope
- When asking about cache behavior, reference the versioned key format: `permctx:{user}:{app}:{feature}:{action}:{uv}:{av}:{pv}:{dv}`
- When asking about SQL rewriting, specify the Trino dialect explicitly
- When uncertain about a design decision, reference the relevant DEC file by number
