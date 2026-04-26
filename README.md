# specman

AI-first spec management CLI for software teams.

`specman` creates a lightweight spec system in your repository and gives modern AI coding tools clear rules for maintaining it.

## Install

```bash
npm install -g specman
```

Or run with npx:

```bash
npx specman init
```

## Quick Start

```bash
cd your-project
specman init
```

`specman init` creates:

- `specs/` with project specs, architecture notes, domain rules, ADRs, and solved cases
- `.specman/` config/status files
- `SPECMAN.md` shared AI protocol
- tool-specific rules for Claude, Codex, Cursor, Copilot, and generic agents

After creating the structure, interactive terminals are asked whether a local AI CLI should fill the specs:

- Claude CLI
- Codex CLI
- printed prompt for Cursor, Copilot, ChatGPT, or another AI tool
- skip

Non-interactive environments print next steps instead of prompting.

## Commands

### `specman init`

Create the spec structure and AI tool rules.

```bash
specman init
specman init --with claude
specman init --with codex
specman init --prompt
specman init --skip-ai
```

### `specman validate`

Check that the spec system is healthy:

- required files/directories exist
- AI rule files exist
- solved cases use the expected structure
- secrets/PII are not present
- case files are not too large
- draft/template-only files are flagged

```bash
specman validate
specman validate --review
specman validate --logic
specman validate --logic --update
```

`--review` checks whether specs appear stale against current code.

`--logic` checks logic-lock hashes when a snapshot exists. Use `--logic --update` after reviewing approved logic changes to create or refresh the snapshot.

### `specman sync`

Update AI tool rules from the current specs.

```bash
specman sync
specman sync --check
specman sync --yes
```

This regenerates:

- `SPECMAN.md`
- `CLAUDE.md`
- `CODEX.md`
- `AGENTS.md`
- `.cursor/rules/specman.mdc`
- `.github/copilot-instructions.md`

Run it after changing specs so Claude, Cursor, Codex, Copilot, and other agents read the latest rules, cases, domain logic, ADRs, and workflows.

If an AI tool file already has user-written instructions, `sync` previews the append and asks for confirmation before adding a managed specman block. Existing specman blocks are updated in place.

### `specman remove`

Preview and safely remove specman-managed files.

```bash
specman remove
specman remove --yes
```

`remove` deletes fully managed generated files and strips only the specman managed block from user-authored AI instruction files.

## Generated Structure

```text
specs/
  00-project-overview.md
  01-detected-stack.md
  02-assumptions.md
  03-open-questions.md
  product/
  engineering/
  architecture/
  domain/
  adr/
  cases/
  ai/

.specman/
  config.json
  status.json
  snapshots/

SPECMAN.md
CLAUDE.md
CODEX.md
AGENTS.md
.cursor/rules/specman.mdc
.github/copilot-instructions.md
```

## How AI Tools Use It

Generated AI rules tell agents to:

- read `specs/` before coding
- follow domain rules and ADRs
- avoid secrets, raw production logs, customer data, and PII
- create solved cases in `specs/cases/` after meaningful fixes
- reuse prior cases when similar problems appear
- update case usage metadata: `Times Used`, `Successful Uses`, `Score`

## License

MIT
