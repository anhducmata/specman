# AI Instructions

> ⚠️ DRAFT — These instructions guide AI coding tools working on this project.

## Before Coding
1. Read all files in `specs/` to understand the project context
2. Check `specs/domain/` for business rules that must not be violated
3. Check `specs/adr/` for architecture decisions
4. Search `specs/cases/` for related solved problems

## During Coding
- Follow approved specs as source of truth
- Follow coding rules in `specs/engineering/`
- Do not change architecture decisions unless explicitly asked
- Do not violate domain rules
- If a request conflicts with specs, stop and explain the conflict first

## After Coding
- If you solved a meaningful issue, create a solved case in `specs/cases/` using the standard case template.
- Do not store secrets or raw production logs in solved cases
