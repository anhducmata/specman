# Commander

AI session recorder and knowledge base CLI.

## What it does

- Records Claude Code sessions automatically via a Stop hook
- Stores decisions, feedback, and patterns inside your project repo (`.commander/`)
- Gives every AI agent full project context on session start via `CLAUDE.md`
- Knowledge travels with the repo — new devs get full history on clone

## Install

```bash
curl -s https://raw.githubusercontent.com/AmiliAsia/commander/main/install.sh | bash
```

Or manually:
```bash
cp commander ~/.local/bin/commander
chmod +x ~/.local/bin/commander
```

## Usage

```bash
# In any project
commander init                    # creates .commander/ + wires CLAUDE.md + Stop hook

# Each session
commander session new <slug>      # start
commander session end             # end (Stop hook auto-runs when Claude closes)

# Log knowledge
commander decision new <slug>     # architectural decision
commander feedback new <slug>     # outcome / lesson learned

# Utilities
commander status                  # show KB stats
commander compress                # print session compression prompt
commander eject                   # remove commander from this project
```

## How it works

```
~/.local/bin/commander     ← CLI binary (installed globally, per machine)

your-project/
├── .commander/            ← knowledge base (committed to git, shared with team)
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

## RL Loop

Session → reasoning trace → outcome → feedback → heuristic update → next session improves

Every change is a git commit. History is the audit trail.
