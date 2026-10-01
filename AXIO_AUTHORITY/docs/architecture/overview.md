# Architecture — Overview

AXIOVITAL AUTHORITY is the **platform control plane** for the AxioVital B2B
healthcare network. It is a separate repository (`AXIO_AUTHORITY`) and a
separate administrative application from AxioVital Native (the clinical
operations / data plane).

## Ecosystem position

```
                         AXIOVITAL
                 GLOBAL HEALTHCARE PLATFORM
                            │
             ┌──────────────┼──────────────┐
            B2C            B2B            B2G
                            │
                            ▼
                     AXIOVITAL CLIENTS
              (Native desktop · Mobile · Partner APIs)
                            │
                            ▼
                     AXIOVITAL NATIVE        ← data / operations plane
                            │
                            ▼
                     AXIOVITAL BACKEND
                            │
                     AGARSANDHANI DATA
                      (identity + tenants)
                            │
                            ▼
                   AXIOVITAL AUTHORITY       ← control plane (this repo)
```

## What Authority governs

| Domain | Examples |
|---|---|
| Partners | hospitals, clinics, laboratories, insurers, pharmacies, government orgs |
| Tenants | per-partner data stores, lifecycle, provisioning |
| Operators | per-partner identities (`AXO-…`), types A/C/S/T/D |
| Credentials | enrollment workflows and credential *state* (never secret values) |
| Access & policy | RBAC roles/permissions, security policy status |
| Platform audit | append-only log of every administrative action |
| Integrations | backend, Native, ABHA/ABDM, FHIR, HL7, DICOM, external systems |
| Infrastructure | backend-reported health of API, DB, Redis, storage, events, auth |

## What Authority never touches

Patient records, encounters, prescriptions, lab results, insurance documents,
clinical reports, medical images. See `control-plane-vs-data-plane.md`.

## Runtime topology (correct vs incorrect)

Correct — the browser talks only to the backend:

```
AXIO_AUTHORITY (browser)
        │  HTTPS / REST
        ▼
AXIOVITAL BACKEND
        │
        ├── provisioning service → database infrastructure
        ├── identity service     → credential issuance
        └── audit service        → append-only log
```

Incorrect — and forbidden by `docs/security/boundaries.md`:

```
AXIO_AUTHORITY (browser) ──✕──► PostgreSQL / Redis / AWS
```

## Repository map

- `authority-frontend/` — Next.js 14 App Router console (this is the only
  runtime in the repo; everything else is packages/docs/tests).
- `packages/shared-types` — control-plane domain types.
- `packages/api-contracts` — REST contracts the frontend is built against.
- `packages/validation` — Zod schemas for forms and payloads.
- `packages/ui` — AxioVital design tokens (visual baseline).
- `docs/` — architecture, security, workflows, API.
- `security/` — SECURITY.md: boundaries and review checklist.
- `tests/` — repo-level test notes; runnable suites live in
  `authority-frontend/tests/`.
