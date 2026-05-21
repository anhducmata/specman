# Permission Service — Overview

**Language:** Go 1.23
**Port:** 8080
**Purpose:** Fail-closed permission evaluation engine. Single source of truth for all data access across the Amili platform.

---

## What It Does

Evaluates whether a user may perform an action in an app, returning a rich **permission context** (functional roles + data-access scopes) consumed by downstream services, primarily the Query Gateway.

## Key APIs

| Endpoint | Purpose |
|---|---|
| `POST /check-permission` | Single permission check |
| `POST /check-permissions` | Batch check (partial cache hit support) |
| `GET /ready` | Health: pings Postgres + Redis |

## Tech Stack

| Component | Role |
|---|---|
| **Casbin (Postgres-backed)** | Functional auth: role → app → action |
| **PostgreSQL** | Users, app_controls, data grants, audit logs |
| **Redis** | Versioned cache-aside for permission contexts |
| **AWS ECS** | Deployment via SST |
| **GitHub Actions + OIDC** | CI/CD, no long-lived AWS credentials |

## Deployment Environments

- Dev: internal AWS VPC
- Prod: internal AWS VPC, isolated
- Config: AWS SSM Parameter Store (never hardcoded)

## Seed Test Users

| user_id | role | notes |
|---|---|---|
| `user-123` | analyst | grants for probiome |
| `user-456` | analyst | suspended — all checks denied |
| `user-789` | admin | global admin |
| `user-blocked` | analyst | explicitly blocked from app |
