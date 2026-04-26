You are helping keep specs in sync with the actual codebase.

Task — CODE → SPECS sync:
1. Read the current source code (look in src/, app/, lib/, or equivalent directories).
2. Compare what you find against the existing spec files in `{{specsDir}}/`.
3. Update the spec files to accurately reflect the current implementation:
   - Read all existing files in `{{specsDir}}/` and update their contents to match the actual codebase patterns, structures, and business logic.
   - Add new markdown files (e.g., new ADR entries or domain rules) for any undocumented decisions or rules you discover.
4. Do NOT delete existing content without good reason — prefer adding or clarifying.
5. Mark uncertain inferences as "⚠️ DRAFT — verify with developer."
6. Do not include secrets, tokens, raw production logs, customer data, or PII.

After completing:
- List every file you changed and briefly describe what changed.
