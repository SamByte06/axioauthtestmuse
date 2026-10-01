# Workflow — Tenant Provisioning

Tenants are the per-partner data stores. Authority **requests** provisioning;
the backend **performs** it.

## Lifecycle

```
CREATING → PROVISIONING → READY → ACTIVE
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
          SUSPENDED                  DECOMMISSIONING → DECOMMISSIONED
```

The UI distinguishes every state visually (`lifecycleTone`); a tenant in
`PROVISIONING` is never presented as `ACTIVE`.

## Provisioning request

`POST /api/v1/authority/tenants/{tenantId}/provision`

- Authority administrator clicks "Start provisioning" / "Retry provisioning"
  (requires `authority.tenant.provision`).
- The backend's provisioning service creates the data store according to the
  partner's isolation mode:
  - `SHARED` — schema/row-isolated within shared infrastructure
  - `DEDICATED_DATABASE` — isolated database for the tenant
  - `DEDICATED_CLUSTER` — future; contract reserves the value
- Progress is observed via `GET /tenants/{tenantId}` (`provisioningStatus`:
  `NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED | ROLLED_BACK`).

## Correct vs incorrect topology

```
CORRECT
AXIO_AUTHORITY ──HTTPS──► AXIOVITAL BACKEND ──► PROVISIONING SERVICE ──► DB INFRA

INCORRECT (forbidden)
AXIO_AUTHORITY ──✕──► PostgreSQL
```

## Failure handling

- `FAILED` → the UI offers "Retry provisioning" (same idempotency-safe
  endpoint) and shows the backend's administrator-facing message plus the
  correlation ID.
- `ROLLED_BACK` → partial infrastructure was torn down; the tenant is not
  usable until provisioning succeeds.
- The browser never sees database credentials, connection strings, or
  infrastructure error internals — only the safe `message` field.
