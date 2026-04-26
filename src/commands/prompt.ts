import { loadStatus } from '../core/config.js';

/**
 * Print a reusable prompt for pasting into any AI coding tool.
 */
export async function promptCommand(root: string): Promise<void> {
  const status = await loadStatus(root);
  const approvalStatus = status.approved
    ? 'Specs have been reviewed and approved.'
    : 'Specs have NOT been approved yet — treat as draft assumptions.';

  const prompt = `
You are working on a project that uses specman for spec management.

Before writing any code:
1. Read all files in the \`specs/\` directory to understand the project context.
2. Pay special attention to:
   - \`specs/domain/\` — Business rules that must NEVER be violated.
   - \`specs/adr/\` — Architecture decisions that should be followed.
   - \`specs/engineering/\` — Coding and testing standards.
   - \`specs/cases/\` — Previously solved problems and solutions.

Current spec status: ${approvalStatus}

Rules:
- Follow approved specs as the source of truth.
- If specs are not approved, treat them as assumptions — verify before relying on them.
- Search solved cases before solving similar problems.
- If your task conflicts with any spec, STOP and explain the conflict before proceeding.
- Do NOT violate domain rules or change architecture decisions without explicit approval.
- Summarize the relevant domain rules and ADRs before writing code.
- After solving a meaningful issue, suggest creating a solved case with \`specman capture\`.
`.trim();

  console.log(prompt);
}
