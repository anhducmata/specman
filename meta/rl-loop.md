# RL Loop — How the Commander Self-Improves

This document explains the full feedback loop to any AI reading this repo.

---

## The Core Idea

The commander repo is not just documentation — it is a **training dataset** that evolves. Every session adds observations. Every feedback record adds labeled outcomes. Every heuristic update applies a learned correction. Over time, the AI reading this repo makes better decisions because the repo encodes what worked and what didn't.

This is analogous to Reinforcement Learning from Human Feedback (RLHF), but implemented as:
- **Policy** = `identity/decision-heuristics.md` (the evolving rulebook)
- **Observations** = `sessions/` (what the AI did and why)
- **Reward signals** = `feedback/` (was the outcome good or bad?)
- **Policy updates** = version bumps to `decision-heuristics.md` (the lesson applied)
- **Value function** = `patterns/` (distilled, generalizable knowledge)

No model fine-tuning. No GPU required. The "training" happens at inference time via updated context.

---

## The Loop Step by Step

```
┌─────────────────────────────────────────────────────────────┐
│  1. SESSION START                                            │
│     AI loads Tier 1 (identity/) + retrieves Tier 2 + 3      │
│     Opens session file (status: in-progress)                 │
│     Commits: "session: start YYYY-MM-DD--NNN--slug"          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  2. SESSION RUNS                                             │
│     AI acts, records reasoning trace inline                  │
│     Creates DEC files for significant decisions              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  3. SESSION ENDS                                             │
│     Fill Outcome + Surprises/Anomalies                       │
│     Compress body to ~200 tokens                             │
│     Update status: completed                                 │
│     Commits: "session: complete YYYY-MM-DD--NNN--slug"       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (time passes — days or weeks)
┌──────────────────────────────▼──────────────────────────────┐
│  4. OUTCOME OBSERVED                                         │
│     Human or AI observes whether the decision worked         │
│     Creates feedback/FB-NNN.md                               │
│     Links to session + DEC files                             │
│     Records: expected vs. actual, delta analysis, lessons    │
│     Commits: "feedback: FB-NNN outcome=positive/negative"    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  5. HEURISTIC UPDATE (if warranted)                          │
│     FB-NNN recommends heuristic changes                      │
│     Human reviews + applies to decision-heuristics.md        │
│     Version bumped (semver): 1.0.0 → 1.1.0                  │
│     Entry added to identity/changelog.md                     │
│     Commits: "heuristics(v1.1.0): add H-ARCH-04 from FB-001"│
│     Tags: git tag identity-v1.1.0                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  6. NEXT SESSION LOADS UPDATED HEURISTICS                    │
│     Tier 1 now includes the new rule                         │
│     AI avoids repeating the mistake (or reinforces success)  │
│     Loop closed.                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Traceability Chain

Every heuristic mutation is fully traceable:

```
decision-heuristics.md v1.1.0
  → identity/changelog.md (what changed, why)
    → feedback/FB-001.md (the outcome that triggered it)
      → sessions/2026-05-21--001--slug.md (the session where the decision was made)
        → decisions/DEC-004.md (the architectural decision)
          → [reasoning trace in session body] (the original thinking)
```

Git history provides the timestamp for every step.

---

## Promoting to Patterns

When the same lesson appears in 2+ feedback records, it is promoted to `patterns/`. Patterns are distilled, generalizable learnings that are retrieved for many future sessions, not just the ones directly linked to the original feedback.

**Threshold:** 2+ independent feedback records with the same lesson → promote to `patterns/`.

---

## Preferred Examples Library

When a human corrects an AI response or explicitly approves a non-obvious choice, a triplet is added to `preferred-examples/`:
- Input context
- Preferred output
- Why preferred is better

At session start, top-3 most similar examples are retrieved. This provides alignment signal at inference cost only — no fine-tuning needed.
