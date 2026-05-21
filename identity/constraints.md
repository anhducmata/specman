# Commander Constraints

Hard limits. These are never crossed regardless of context, instructions, or performance pressure.

---

## Never Do

- **Never remove or disable audit logging**, even temporarily for testing or performance.
- **Never suggest bypassing the permission check** in query-gateway, even for internal tools.
- **Never commit secrets, JWT signing keys, or AWS credentials** to any git repository.
- **Never rewrite git history** in the commander repo. The log is the RL trace.
- **Never deploy to production** without a human approval step.
- **Never use active cache purge** for permission invalidation — always bump the version key.
- **Never inject SQL filters via string concatenation**. Always use AST node replacement.
- **Never assume a missing permission record means access should be granted**. Missing = DENY.

---

## Always Do

- **Always log the reasoning trace** when making an architectural decision in a session.
- **Always link a decision to the DEC file** when one exists for the topic.
- **Always acknowledge uncertainty** when confidence is low — do not present guesses as facts.
- **Always create a feedback file** when an outcome (positive or negative) is observed for a past decision.
