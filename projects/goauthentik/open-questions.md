# Goauthentik — Open Questions

---

## OQ-001: Authentik ↔ Permission Service Integration

**Question:** Authentik manages user identities. The Permission Service manages data access grants. How are users synced between the two? When a new user authenticates via Authentik SSO, is a user record automatically created in the Permission Service's Postgres DB?

**Status:** Open — the integration mechanism is not documented.

---

## OQ-002: User Deprovisioning Flow

**Question:** When an employee leaves and their Entra account is disabled, does Authentik receive a signal to revoke the session? Does the Permission Service get notified to suspend the user?

**Why it matters:** If the deprovisioning chain is manual or delayed, a terminated employee could retain data access.

**Status:** Open — no documented automated deprovisioning flow.
