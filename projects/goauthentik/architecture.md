# Goauthentik — Architecture

## Stack

```
Internet
  → ALB (HTTPS, ACM cert, Route53 DNS)
    → ECS Fargate (authentik-server × 2 in prod)
      ↓
      RDS PostgreSQL  (Authentik app DB)
      ElastiCache Redis (sessions, cache)
      SSM Parameter Store (all secrets, pulled at runtime)
```

## IaC: Pulumi TypeScript

Pulumi state stored in S3:
- Dev: `s3://amili-dev-pulumi`
- Prod: `s3://amili-pulumi`

**Prod deploys via GitHub Actions only.** Local credentials do not have write access to the prod S3 state bucket.

## Microsoft Entra ID (Azure AD) SSO

Single-tenant Entra app. Must use tenant-specific OAuth URLs — NOT `/common/`:
```
authorization_url: https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize
access_token_url:  https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token
profile_url:       https://graph.microsoft.com/v1.0/me
```

The Authentik default `/common/` endpoint fails for single-tenant apps (AADSTS50194 error). See gotchas.

## ALB Health Check

Authentik's `/-/health/live/` returns HTTP `204`, not `200`. ALB target group must have `matcher: "204"` — the default `200` matcher causes perpetual health check failures and ECS task restarts.
