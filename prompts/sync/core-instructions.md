## Project Specs

{{approvalNote}}

## Before Making Any Code Changes

1. **Read the specs directory** (`{{specsDir}}/`) to understand the project context.
2. **Check domain rules** in `{{specsDir}}/domain/` — these must NEVER be violated.
3. **Check ADRs** in `{{specsDir}}/adr/` — follow existing architecture decisions.
4. **Search solved cases** in `{{specsDir}}/cases/` before solving similar problems.

## Critical Rules

- Treat approved specs as the **source of truth**.
- Treat unapproved specs as **draft assumptions only** — verify with the developer.
- **Do NOT change architecture decisions** unless explicitly asked by the developer.
- **Do NOT violate domain rules** under any circumstances.
- If a request **conflicts with specs**, stop and explain the conflict before proceeding.
- If solving a meaningful issue, **create a solved case in `{{specsDir}}/cases/` using the standard case template**.
- **Do NOT store secrets**, raw production logs, or PII in solved cases.

## Spec Structure

- `{{specsDir}}/00-project-overview.md` — Project overview
- `{{specsDir}}/01-detected-stack.md` — Technology stack
- `{{specsDir}}/02-assumptions.md` — Assumptions (check if approved)
- `{{specsDir}}/03-open-questions.md` — Open questions
- `{{specsDir}}/product/` — Product requirements
- `{{specsDir}}/engineering/` — Coding and testing rules
- `{{specsDir}}/architecture/` — System architecture and components
- `{{specsDir}}/domain/` — Business rules, workflows, decision tables, scenarios
- `{{specsDir}}/adr/` — Architecture Decision Records
- `{{specsDir}}/cases/` — Solved cases (previous problems and solutions)
- `{{specsDir}}/ai/` — AI-specific instructions, forbidden patterns, checklist

{{caseCaptureProtocol}}