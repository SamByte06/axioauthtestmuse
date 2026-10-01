# Workflow — Partner Provisioning

`POST /api/v1/authority/partners` — one transactional request.

```
Authority Administrator
        │
        ▼
Create Partner (UI: /partners/new)
  1. Details form (Zod-validated client-side AND server-side)
  2. Review screen (consequence stated: IDs generated, tenant
     provisioned, audit written)
        │
        ▼
Backend transaction
        │
        ├── Validate request (schema, state code, isolation mode, idempotency key)
        ├── Generate Partner ID  →  AXP-{STATE}-{SUFFIX}
        │                           SUFFIX = exactly 2 letters + exactly 4 digits
        │                           e.g. AXP-KL-7K42F8   (7K4R2F is invalid)
        ├── Create tenant record
        ├── Create initial operator  →  AXO-{SUFFIX}-{T}{SEQ}
        │                              e.g. AXO-7K42F8-A00001
        ├── Provision tenant data store (SHARED or DEDICATED_DATABASE)
        ├── Create credential enrollment for the initial operator
        ├── Write audit event (PARTNER_CREATED + correlated child events)
        │
        ▼
COMMIT → partner ACTIVE (single response: partner, tenant,
         initial operator, correlation ID)
```

## Failure semantics

If ANY step fails:

```
ROLLBACK
  - no partner row remains ACTIVE
  - no half-provisioned tenant is presented as ready
  - audit event TENANT_PROVISIONING_FAILED is written
  - the UI shows: failure message + correlation ID + "nothing was activated"
```

The UI must NOT show the partner as ACTIVE if provisioning failed.
Idempotency: the wizard generates one `idempotencyKey` per session; safe
retries reuse it so a double-submit cannot create two partners.

## Medanta test fixture

For development/testing only:

```
Organization:  Medanta (TEST)
State:         Kerala
Partner ID:    AXP-KL-7K42F8
Operator:      AXO-7K42F8-A00001
```

- Flagged `testFixture: true`; the UI renders a TEST badge.
- It must never be presented as a production partnership, and no real
  person's credentials may be attached to it.
- It exists as a documented fixture (docs) and in test data — not as
  seeded production data.
