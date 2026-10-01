# Demo Mode

AxioVital Authority ships with an **opt-in demo mode** so the console's UI,
forms, and workflows can be clicked through without a backend.

## Enabling

In `authority-frontend/.env.local`:

```env
NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true
```

Then restart the dev server (`NEXT_PUBLIC_*` variables are inlined at startup).

Demo mode is **off by default** and must never be enabled in production.

## What happens when it is on

- `apiFetch` routes every request to the in-memory demo backend
  (`authority-frontend/src/lib/api/demo-backend.ts`) instead of a real backend.
  The demo code is loaded via dynamic import and is never bundled into the
  production path unless the flag is set.
- The persistent amber demo banner is not shown. The sign-in page displays an
  inline demo notice when demo mode is active.
- Sign-in accepts any valid-form email/password as the **demo administrator**
  (`SUPER_AUTHORITY_ADMIN`). There are no real credentials; the sign-in page
  identifies demo mode.
- All data is the documented test fixture set:
  - `AXP-KL-7K42F8` — Medanta (TEST), ACTIVE
  - `AXP-TN-KX4207` — CityCare Clinics (TEST), PENDING
  - `AXP-MH-QM2041` — Nova Diagnostics (TEST), SUSPENDED
  - Operators `AXO-7K42F8-A00001`, `AXO-7K42F8-C00002`, `AXO-KX4207-A00001`,
    `AXO-QM2041-S00001`
- Records created in demo mode (partners, operators, enrollments) get
  backend-format IDs (e.g. `AXP-KL-9X31AB`) and are marked `testFixture`.
  Correlation IDs are prefixed `AX-REQ-DEMO-`.
- Tenant "provisioning" completes **instantly** and says so explicitly — demo
  mode does not simulate provisioning timers.
- **State resets on every page reload.** Nothing persists, nothing is real.

## What it is not

- Not a backend, not a mock of the backend's security: there is no real
  authentication, authorization, or audit durability in demo mode.
- Not for production, staging, or real partner data. Ever.

## Implementation notes

- The demo backend implements the same REST contract shapes the typed API
  clients expect, so no page or component code changes for demo mode.
- Unit tests: `authority-frontend/tests/unit/demo-backend.test.ts`.
