# Query Gateway — Overview

**Language:** Go 1.23 + Python FastAPI sidecar
**Port:** 9090 (Gateway), 8000 (Python sidecar)
**Purpose:** Intercepts SQL queries, validates permissions, rewrites SQL to enforce row-level and column-level security before execution on AWS Athena (Trino engine).

---

## What It Does

Acts as a transparent proxy between data consumers (Jupyter, BI tools, apps) and AWS Athena.
Every query is: authenticated → permission-checked → SQL-rewritten → forwarded.

## Key API

| Endpoint | Purpose |
|---|---|
| `POST /query` | Intercept, validate, rewrite, and forward a SQL query |

**Request fields:** `query`, `domain` (required), `project` (optional), `app`, `feature`, `action`

## Tech Stack

| Component | Role |
|---|---|
| **Go** | HTTP server, JWT validation, permission client, orchestration |
| **Python FastAPI + sqlglot** | Stateless SQL AST parsing and rewriting (Trino dialect) |
| **Permission Service** | External permission + data scope validation |
| **In-memory TTL cache** | 30s permission check cache (reduces load on Permission Service) |
| **AWS ECS** | Deployment (stateless, horizontally scalable) |

## Two-Phase SQL Processing

1. `/extract` → Python sidecar extracts all table names from the SQL AST
2. Permission check on extracted tables against user's data scope
3. `/rewrite` → Python sidecar injects RLS filters at AST node level
4. Rewritten SQL returned to caller (ready for Athena execution)
