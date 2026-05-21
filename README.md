# specman

AI session recorder and knowledge base CLI. Stores decisions, sessions, and patterns inside your project repo so every AI agent starts with full context.

## Install

```bash
npm install -g specman
```

Or without npm:
```bash
curl -s https://raw.githubusercontent.com/anhducmata/specman/main/install.sh | bash
```

## Usage

```bash
# In any project
sb init                    # creates .solvedbook/ + wires CLAUDE.md + Stop hook

# Each session
sb session new <slug>      # start
sb session end             # end (Stop hook auto-runs when Claude closes)

# Log knowledge
sb decision new <slug>     # architectural decision
sb feedback new <slug>     # outcome / lesson learned

# Utilities
sb status                  # show KB stats
sb compress                # print session compression prompt
sb eject                   # remove specman from this project
```

## How it works

```
npm install -g specman  ← installs `sb` globally

your-project/
├── .solvedbook/           ← knowledge base (committed to git, shared with team)
│   ├── identity/          ← principles + heuristics (seeded by init, owned by team)
│   ├── sessions/          ← one file per Claude session
│   ├── decisions/         ← architectural decision records
│   ├── feedback/          ← outcome records → drive heuristic updates
│   ├── patterns/          ← distilled cross-session learnings
│   └── meta/              ← session index + retrieval guide
├── CLAUDE.md              ← auto-loaded by Claude Code (bootstrap protocol)
└── .claude/
    └── settings.json      ← Stop hook → auto-commits session on Claude exit
```

## Three-tier memory

```
TIER 1 — Always loaded (~3K tokens, prompt-cacheable)
  .solvedbook/identity/constitution.md
  .solvedbook/identity/decision-heuristics.md
  .solvedbook/identity/constraints.md

TIER 2 — Retrieved by task (~2K tokens)
  .solvedbook/decisions/   top-2 by relevance
  .solvedbook/patterns/    if cross-cutting

TIER 3 — Recent history (~2K tokens)
  .solvedbook/sessions/    top-3 by recency + relevance
```

Retrieval score: `0.6×relevance + 0.25×recency + 0.15×importance`

## RL Loop

Session → reasoning trace → outcome → feedback → heuristic update → next session improves

Every change is a git commit. History is the audit trail.
