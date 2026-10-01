# SECURITY.md — AxioVital Authority

## Scope

This document states the security boundaries of the Authority frontend.
It is a living checklist, not a certification.

## Threat model (summary)

| Threat | Mitigation in this repo |
|---|---|
| Credential theft via XSS | Tokens in httpOnly cookies only; never in JS, `localStorage`, or URLs |
| Clickjacking of admin console | `X-Frame-Options: DENY`, `robots: noindex` |
| CSRF on mutating requests | Backend must enforce SameSite cookie + CSRF tokens; frontend sends `X-Correlation-Id` and JSON content-type |
| Privilege escalation via UI | UI mirrors permissions; backend enforces every permission server-side |
| Secret leakage to browser | Contracts forbid secret fields; credentials domain is state-only |
| Fake-success social engineering | No fabricated state; explicit unconfigured/unreachable UI |
| Audit tampering | Append-only log; no edit/delete affordance in UI |
| Direct database access | No DB drivers, no connection strings, no infrastructure SDKs in frontend deps |

## Dependencies

Run `npm audit` in CI. The frontend dependency set is intentionally small
(Next.js, React, Tailwind, Zod, test tooling). No database drivers, no AWS
SDKs, no crypto libraries in the browser bundle — by policy.

## Incident-relevant surfaces

- `/login` — rate limiting and `AUTHORITY_LOGIN_FAILURE` logging are
  backend responsibilities; the frontend never distinguishes "bad email"
  from "bad password".
- Destructive actions — all require re-authentication freshness per backend
  policy (session `expiresAt` honored), confirmation, and audit reason.
- Correlation IDs — every failure surfaces one; keep backend request logs
  for at least the audit retention window.

## What this frontend will not do

See `docs/security/boundaries.md`. Any PR that adds a secret-adjacent
field, a direct infrastructure connection, a clinical data type, or a fake
success path must be rejected in review.

## Reporting

Security issues in this repository: report to the AxioVital platform
security team (internal). Do not file public issues with exploit details.
