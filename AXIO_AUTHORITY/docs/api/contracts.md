# API Contracts

Base: `{NEXT_PUBLIC_AUTHORITY_API_BASE_URL}/api/v1/authority`
Transport: REST over HTTPS. Auth: httpOnly session cookie (backend-issued).
Every mutating request sends `X-Correlation-Id`.

Status legend:

- **IMPLEMENTED** — frontend typed client + UI exist and are built against
  this contract.
- **BACKEND CONTRACT REQUIRED** — frontend client exists; the backend must
  implement the endpoint for the UI to function. Until then the UI shows
  "Backend connection not configured" / "endpoint unavailable" — never fake
  success.
- **FUTURE** — contract drafted; not built in frontend or backend yet.

## Authentication

| Endpoint | Status | Permission |
|---|---|---|
| `POST /auth/login` | BACKEND CONTRACT REQUIRED | public (rate-limited) |
| `POST /auth/logout` | BACKEND CONTRACT REQUIRED | authenticated |
| `GET /auth/session` | BACKEND CONTRACT REQUIRED | authenticated |

## Dashboard

| Endpoint | Status | Permission |
|---|---|---|
| `GET /dashboard` | BACKEND CONTRACT REQUIRED | `authority.dashboard.read` |

## Partners

| Endpoint | Status | Permission |
|---|---|---|
| `POST /partners` | BACKEND CONTRACT REQUIRED | `authority.partner.create` |
| `GET /partners` | BACKEND CONTRACT REQUIRED | `authority.partner.read` |
| `GET /partners/{partnerId}` | BACKEND CONTRACT REQUIRED | `authority.partner.read` |
| `PATCH /partners/{partnerId}` | BACKEND CONTRACT REQUIRED | `authority.partner.update` |
| `POST /partners/{partnerId}/activate` | BACKEND CONTRACT REQUIRED | `authority.partner.update` |
| `POST /partners/{partnerId}/suspend` | BACKEND CONTRACT REQUIRED | `authority.partner.suspend` |

## Tenants

| Endpoint | Status | Permission |
|---|---|---|
| `GET /tenants` | BACKEND CONTRACT REQUIRED | `authority.tenant.read` |
| `GET /tenants/{tenantId}` | BACKEND CONTRACT REQUIRED | `authority.tenant.read` |
| `POST /tenants/{tenantId}/provision` | BACKEND CONTRACT REQUIRED | `authority.tenant.provision` |
| `POST /tenants/{tenantId}/suspend` | BACKEND CONTRACT REQUIRED | `authority.tenant.suspend` |

## Operators

| Endpoint | Status | Permission |
|---|---|---|
| `GET /operators` | BACKEND CONTRACT REQUIRED | `authority.operator.read` |
| `POST /operators` | BACKEND CONTRACT REQUIRED | `authority.operator.create` |
| `GET /operators/{operatorId}` | BACKEND CONTRACT REQUIRED | `authority.operator.read` |
| `POST /operators/{operatorId}/suspend` | BACKEND CONTRACT REQUIRED | `authority.operator.suspend` |
| `POST /operators/{operatorId}/revoke` | BACKEND CONTRACT REQUIRED | `authority.operator.revoke` |

## Credentials

| Endpoint | Status | Permission |
|---|---|---|
| `GET /credentials` | BACKEND CONTRACT REQUIRED | `authority.credentials.read` |
| `POST /operators/{operatorId}/enrollment` | BACKEND CONTRACT REQUIRED | `authority.credentials.enroll` |
| `POST /credentials/{credentialId}/revoke` | BACKEND CONTRACT REQUIRED | `authority.credentials.revoke` |

## Security / Audit / Integrations

| Endpoint | Status | Permission |
|---|---|---|
| `GET /security` | BACKEND CONTRACT REQUIRED | `authority.security.read` |
| `GET /audit` | BACKEND CONTRACT REQUIRED | `authority.audit.read` |
| `GET /integrations` | BACKEND CONTRACT REQUIRED | `authority.integration.read` |

## Error model

All errors return:

```json
{
  "code": "PARTNER_NOT_FOUND",
  "message": "Administrator-facing message (no internals, no secrets).",
  "correlationId": "AX-REQ-…",
  "details": { "field": ["reason"] }
}
```

Status codes: `400 401 403 404 409 422 429 500 502 503`. The frontend maps
each to an administrator-facing message (see `client.ts`); stack traces are
never shown.

## Event model (backend-owned)

The backend publishes domain events; Authority consumes derived status via
the API above. Relevant events:

```
PartnerCreated · PartnerActivated · PartnerSuspended
TenantCreated · TenantProvisioningStarted · TenantProvisioningCompleted
· TenantProvisioningFailed
OperatorCreated · OperatorActivated · OperatorSuspended · OperatorRevoked
CredentialEnrollmentCreated · CredentialActivated · CredentialRevoked
SecurityEventCreated
```

The Authority UI does not implement the event broker.
