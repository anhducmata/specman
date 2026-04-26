# specman

AI-first spec management CLI for software teams.

`specman` helps teams manage project specs, architecture decisions, domain logic, solved cases, and AI tool instructions — so that Claude, Cursor, Copilot, Codex, ChatGPT, and other AI coding tools follow the same source of truth.

## Core Concepts

- **Specs** = source of truth for your project
- **Domain rules** = business logic that must not be violated
- **ADRs** = architecture decisions and reasoning
- **Solved cases** = previous problems/bugs/incidents/solutions summarized for reuse
- **AI instructions** = generated files that tell AI tools how to follow project knowledge
- **Logic-lock** = fingerprint system to detect when important domain logic may have changed

## Install

```bash
# Clone and install locally
git clone <repo-url>
cd specman
npm install
npm run build
npm link
```

## Quick Start

```bash
# 1. Initialize specs in your project
cd your-project
specman init

# 2. Review generated assumptions
specman review

# 3. Approve specs as source of truth
specman approve

# 4. Generate AI tool instruction files
specman sync all

# 5. AI tools now read specs before coding!
```

## Commands

### `specman init`
Scan the current project, detect stack, create `specs/` structure, generate draft assumptions.

### `specman review`
Print generated assumptions, detected stack, open questions, and items needing manual review.

### `specman approve`
Mark generated specs as approved source of truth.

### `specman sync all`
Generate AI tool instruction files:
- `CLAUDE.md` — Claude Code
- `AGENTS.md` — Generic AI agents
- `.cursor/rules/specman.mdc` — Cursor
- `.github/copilot-instructions.md` — GitHub Copilot

### `specman prompt`
Print a reusable prompt for pasting into any AI coding tool.

### `specman summary`
Generate a short project context summary for AI.

### `specman add <type> <name>`
Add new spec files:
```bash
specman add spec my-feature
specman add domain permission-logic
specman add adr "deny overrides allow"
specman add case "mongodb connection spike"
specman add rule validation-rules
```

### `specman check`
Validate spec structure, detect missing files, unapproved assumptions, secrets, and oversized cases.

### `specman search <query>`
Search specs, ADRs, domain rules, and solved cases.

### `specman capture`
Interactively capture a solved problem into a case file.

### `specman snapshot`
Create/update logic-lock fingerprints for important files.

### `specman validate --logic`
Compare current file hashes with saved logic-lock snapshot.

## Generated Structure

```
specs/
  00-project-overview.md
  01-detected-stack.md
  02-assumptions.md
  03-open-questions.md
  product/
    requirements.md
  engineering/
    coding-rules.md
    testing-rules.md
  architecture/
    system-overview.md
    components.md
  domain/
    business-rules.md
    workflows.md
    decision-tables.md
    scenarios.yaml
  adr/
    0001-initial-project-assumptions.md
  cases/
    README.md
  ai/
    instructions.md
    forbidden.md
    checklist.md

.specman/
  config.json
  status.json
  snapshots/
    logic-lock.json
```

## Design Principles

- AI tools should read files from the repo, not rely on running the CLI every time
- The CLI is for initializing, maintaining, validating, syncing, searching, and capturing knowledge
- Specs are the source of truth — AI must read them before coding
- Domain rules must not be violated by AI
- Solved cases should be searched before solving similar problems

## License

MIT
