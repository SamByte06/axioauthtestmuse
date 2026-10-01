# Authorization (RBAC)

## Principle

**Frontend visibility is not the security boundary. The backend enforces
every permission on every request.** The frontend mirrors permissions only
to avoid showing actions the administrator cannot perform.

## Permissions

Platform permissions (see `ROLE_PERMISSIONS` in `packages/shared-types`):

```
authority.dashboard.read

authority.partner.read / .create / .update / .suspend
authority.tenant.read / .provision / .suspend
authority.operator.read / .create / .suspend / .revoke
authority.credentials.read / .enroll / .revoke
authority.audit.read
authority.security.read
authority.integration.read / .manage
```

Each API contract in `packages/api-contracts` declares its
`requiresPermission`; the backend must reject requests lacking it (403) and
log the denial.

## Roles (least privilege)

| Role | Intended holder |
|---|---|
| `SUPER_AUTHORITY_ADMIN` | Platform owners; full control incl. suspend/revoke |
| `AUTHORITY_ADMIN` | Day-to-day platform administration (no suspend/revoke of partners) |
| `SECURITY_ADMIN` | Credential/security operations; suspend & revoke operators/credentials |
| `PARTNER_ADMIN` | Partner onboarding; create partners/operators, enroll credentials |
| `AUDITOR` | Read-only audit + security visibility |
| `READ_ONLY_AUTHORITY` | Read-only across the console |

No role is granted permissions it does not need. In particular, destructive
permissions (`.suspend`, `.revoke`, `.provision`) are withheld from
read-oriented roles.

## Frontend mechanics

- `AuthProvider` loads the backend-issued `AuthoritySession` (roles +
  effective permissions).
- `useCan(permission)` / `hasPermission(session, permission)` gate UI
  affordances (buttons, nav items, routes).
- A `403` from the backend is surfaced as "You do not have permission for
  this action. It has been logged." — the denial itself is an audited event.

## What the frontend must never do

- Infer permissions from roles client-side as an allow-list (the session's
  `permissions` array is authoritative for display).
- Cache an old permission set across re-authentication.
- Treat a hidden button as proof an action is impossible (defense in depth:
  the backend is the enforcer).
