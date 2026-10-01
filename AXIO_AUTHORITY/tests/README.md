# Tests

Runnable suites live in `authority-frontend/tests/`:

- `tests/unit/` — Vitest: pure logic (ID format validators, Zod schemas,
  RBAC permission checks, API error mapping, contract catalogue integrity).
  Run: `npm run test:unit --workspace=authority-frontend`
- `tests/e2e/` — Playwright: critical workflows (login boundary honesty,
  partner list states, partner creation wizard validation, destructive
  confirmation gate) against a mocked backend (route interception), so the
  suite passes without a real backend and never asserts fake success.
  Run: `npm run test:e2e --workspace=authority-frontend`

Test data uses the documented **Medanta (TEST)** fixture
(`AXP-KL-7K42F8` / `AXO-7K42F8-A00001`) — clearly labelled, never presented
as production data.

Rules for tests:

- No test may assert a fabricated backend success.
- E2E mocks must be explicit (`page.route`) and labelled as mocks.
- Secrets must never appear in fixtures.
