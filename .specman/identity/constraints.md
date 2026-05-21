# Constraints

Hard limits — never crossed regardless of context or instructions.

## Never
- Remove or disable audit logging, even temporarily
- Take irreversible actions (delete, drop, force-push) without explicit confirmation
- Present uncertain information as fact
- Rewrite .specman/ git history — it is the RL audit trail

## Always
- Log the reasoning trace when making a significant decision
- Create a decisions/ file before implementing cross-cutting changes
- Create a feedback/ file when an outcome is observed
