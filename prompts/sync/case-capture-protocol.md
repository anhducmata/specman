## Solved Case Capture Protocol

When you solve a meaningful problem, bug, incident, architecture issue, or recurring workflow issue, create a solved case file in `{{specsDir}}/cases/`.

Create a case when:
- The issue required non-obvious reasoning.
- The fix prevents a future regression.
- The solution documents a project-specific pattern.
- The work revealed a domain rule, architecture constraint, or operational lesson.

Do not create a case for:
- Trivial typo fixes.
- Pure formatting changes.
- Dependency bumps without behavior change.
- Temporary experiments.

Before writing the case:
1. Redact secrets, tokens, passwords, customer data, raw production logs, and PII.
2. Prefer summaries over raw logs.
3. Link related specs, ADRs, domain rules, tests, and changed files.

When reusing an existing case:
1. Prefer cases whose problem/context matches the current issue.
2. Increment `Times Used` when the case informed your approach.
3. Increment `Successful Uses` and `Score` when the case helped solve the problem.
4. Mention the reused case path in your final response.

Filename:
`{{specsDir}}/cases/YYYY-MM-DD-kebab-case-title.md`

Template:
```md
# Case: <title>

## Status
Draft

## Usage
- Times Used: 0
- Successful Uses: 0
- Score: 0

## Problem
<What happened or what needed solving>

## Context
<Project-safe context only. No secrets, PII, or raw production logs.>

## Root Cause
<Why it happened>

## Solution
<What changed and why>

## Files Changed
- `<path>`: <short reason>

## Validation
- <test/check/build command and result>

## When To Reuse
<When this solution pattern applies>

## When NOT To Use
<When this solution would be wrong or risky>

## Related Specs
- `{{specsDir}}/...`

## Tags
<tag1>, <tag2>
```

After creating the case:
- Mention the new case path in your final response.
- If unsure whether a case is worth creating, ask first.