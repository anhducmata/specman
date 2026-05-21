# Goauthentik — Gotchas

---

## ALB Health Check Returns 204, Not 200

**Gotcha:** Authentik's `/-/health/live/` endpoint returns HTTP 204. AWS ALB default matcher expects 200. If the target group is not configured with `matcher: "204"`, ECS tasks restart in a loop immediately after deploy.

**Fix:** Set `matcher: "204"` in the ALB target group configuration in Pulumi.

---

## Microsoft Login Button Not Showing After First Deploy

**Gotcha:** Creating the Azure AD OAuth Source is not enough. The source must also be added to the Identification Stage via the Authentik API before the "Sign in with Microsoft" button appears on the login page.

**Fix:** After creating the source, call:
```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -d '{"sources": ["$SOURCE_UUID"], "show_source_labels": true}' \
  https://auth.<env>.amili.asia/api/v3/stages/identification/$STAGE_UUID/
```

---

## AADSTS50194: /common Endpoint Error

**Gotcha:** Authentik defaults to `https://login.microsoftonline.com/common/` for Azure AD OAuth. Single-tenant Entra apps reject this with `AADSTS50194`.

**Fix:** After creating the OAuth source, PUT to `/api/v3/sources/oauth/azuread/` with tenant-specific URLs using `$TENANT_ID`.

---

## Bootstrap Token Is Not a UI Password

**Gotcha:** `AUTHENTIK_BOOTSTRAP_TOKEN` in SSM is an API token, not a login password. Trying to use it as a UI password fails.

**Fix:** Use the token to call the API and set a password for `akadmin`:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"password": "YourPassword"}' \
  https://auth.<env>.amili.asia/api/v3/core/users/<user-pk>/set_password/
```

---

## Pulumi State Lock

**Gotcha:** A failed deploy can leave a lock file in S3. Subsequent deploys fail with a lock error.

**Fix:**
```bash
aws s3 rm "s3://amili-dev-pulumi/.pulumi/locks/organization/goauthentik/dev/<uuid>.json" --region ap-southeast-1
pulumi refresh
```

---

## Prod Deploy Requires GitHub Actions

**Gotcha:** Local AWS credentials do not have write access to the prod state bucket (`s3://amili-pulumi`). Running `pulumi up` locally against prod will fail with AccessDenied.

**Fix:** Use GitHub Actions: `gh workflow run deploy.yml --ref main -f stage=prod`
