# General Prompting Heuristics

Cross-AI prompting strategies for this codebase.

---

## Always Provide Scope

Authorization queries need: user identity, action, app, and data scope (domain/project). Always include all four when asking about permission behavior.

**Good:** "Can user-123 run `export` on `smart-cohort` app in the `oncology` domain?"
**Bad:** "Can user-123 export data?"

---

## Reference DEC Files for Architecture Questions

When asking about a design decision that has a DEC file, reference it. "Why do we use versioned cache keys (DEC-002)?" gives better answers than "Why do we use this cache pattern?"

---

## Specify the SQL Dialect

This system uses Trino/Athena SQL. Always specify "Trino SQL" when asking about query syntax or SQL rewriting behavior.

---

## Use Gotchas Files for Debugging

Before asking general debugging questions, check `projects/{service}/gotchas.md`. Known sharp edges are documented there. This avoids re-explaining problems that have already been solved.

---

## State Confidence Level

When an AI provides an answer with low confidence, it should say so explicitly. "I believe X, but I'm not certain — check `architecture.md`" is better than a confident wrong answer.
