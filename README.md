# Commander Knowledge Base

A structured, RL-inspired memory system for AI agents.
Git history is the audit trail. Every commit is a recorded event.

---

## Quick Start

```bash
# 1. One-time setup (creates CLAUDE.md + Claude Code Stop hook)
bash commander init

# 2. Start a session
bash commander session new <slug> [project...]

# 3. Work — Claude loads context automatically via CLAUDE.md

# 4. End session (or just close Claude — the Stop hook handles it)
bash commander session end

# 5. Log a significant decision
bash commander decision new <slug> [project...]

# 6. Record an outcome
bash commander feedback new <slug>
```

---

## Purpose

This repo gives any AI agent (Claude, Codex, Gemini, etc.) a persistent, evolving memory:
- **Smarter**: retrieves only what's relevant, not everything
- **Cheaper**: Tier 1 is cache-eligible — 90% token cost reduction on repeated sessions
- **Self-improving**: feedback drives heuristic updates without fine-tuning

---

## Bootstrap Protocol

Load in this exact order at the start of every session.

### Phase 1 — Always Load (Tier 1, ~3K tokens, mark for prompt caching)

```
identity/constitution.md
identity/decision-heuristics.md
identity/constraints.md
```

### Phase 2 — Retrieve by Project (Tier 2, select ≤ 3 files)

```
projects/{relevant-project}/gotchas.md          ← always
projects/{relevant-project}/overview.md          ← if unfamiliar
projects/{relevant-project}/architecture.md      ← if architecture decisions involved
decisions/ matching current topic tags            ← top-2 by relevance
patterns/security-patterns.md                    ← always for auth work
```

### Phase 3 — Retrieve Recent History (Tier 3, ≤ 3 sessions)

```
1. Scan meta/session-index.md filtered by project + last 30 days
2. Load top-3 sessions by: score = 0.6*relevance + 0.25*recency + 0.15*importance
3. Load any feedback/ files linked to those sessions
```

### Phase 4 — Retrieve Examples (optional, only if uncertain)

```
preferred-examples/ top-2 most similar to current task
```

### Token Budget

| Tier       | Tokens   | When          |
|------------|----------|---------------|
| Tier 1     | ~3K      | Always        |
| Tier 2     | ~2K      | Selective     |
| Tier 3     | ~2K      | Selective     |
| Examples   | ~1K      | Optional      |
| **Total**  | **≤8K**  | **Target**    |

See `meta/retrieval-guide.md` for detailed retrieval instructions.

---

## Session Workflow

```
START                          END
──────────────────────         ──────────────────────────
1. Load Tier 1 (cached)        1. Fill Outcome + Surprises
2. Retrieve Tier 2 + 3         2. Compress body to ~200 tokens
3. Open sessions/_template.md  3. bash scripts/log-session.sh end
4. bash scripts/log-session.sh start
```

---

## RL Loop (Self-Improvement)

```
Session → Outcome → Feedback File → Heuristic Update → Version Bump → Next Session
```

Full details: `meta/rl-loop.md`

---

## Repository Structure

```
identity/           ← Tier 1: always loaded, prompt-cache this
projects/           ← Tier 2: per-project knowledge, RAG-retrieved
sessions/           ← Tier 3: episodic memory, compressed summaries
decisions/          ← Tier 2: architectural decision records
feedback/           ← Tier 3: outcome records, drives heuristic updates
patterns/           ← Tier 2: distilled cross-session learnings
preferred-examples/ ← Optional: few-shot preference library
ai-systems/         ← AI-specific configuration and prompt strategies
scripts/            ← Helper scripts for session logging
meta/               ← Indexes, retrieval guide, RL loop documentation
```

---

## Git Conventions

| Action                    | Commit message format                              |
|---------------------------|----------------------------------------------------|
| Session start             | `session: start YYYY-MM-DD--NNN--slug`             |
| Session end               | `session: complete YYYY-MM-DD--NNN--slug`          |
| New feedback              | `feedback: FB-NNN outcome=positive\|negative`      |
| Heuristics version bump   | `heuristics(v1.1.0): add H-ARCH-04 from FB-001`   |
| New decision              | `decision: DEC-NNN--slug`                          |

**Never rewrite history.** Git log IS the RL trace.
Tag every heuristics version bump: `identity-v1.1.0`
