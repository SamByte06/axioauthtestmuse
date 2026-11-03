# Architecture Decision Record: Elimination of Enrollment & MFA Secrets in the Admin Control Plane

**Status:** ACCEPTED  
**Date:** 2026-11-04  
**Applies to:** AxioVital Authority Control Plane (`AXIO_AUTHORITY`), ASP.NET Core Backend API (`https://api.quantaforze.com`)

---

## 1. Context & Threat Model

When registering a new hospital (`POST /api/v1/admin/hospitals`), the backend generates the organization, tenant, and initial hospital administrator account. The backend response schema (`CreateHospitalResponse`) returns:
- `enrollment_token`
- `enrollment_url`
- `mfa_secret`
- `mfa_qr_code_uri`

### Security Threat: Second-Factor Compromise by Platform Operators
If `mfa_secret` or `mfa_qr_code_uri` is delivered to or displayed in the Authority Console:
1. Any platform administrator or operator viewing the console can scan the QR code or import the secret key into an authenticator app, cloning the second factor of the hospital administrator before the hospital administrator ever completes enrollment.
2. This invalidates the non-repudiation and security boundary between the platform control plane and tenant organizations (violating Healthcare IAM boundary Principle P4 and P5).
3. If an attacker compromises a platform admin session or browser cache, they gain permanent ability to generate valid TOTP codes for hospital administrators.

---

## 2. Decision & Defense-in-Depth

The Authority frontend implements an unconditional boundary rejecting these secrets:

### Boundary 1: BFF Proxy Layer (`src/app/api/backend/[...path]/route.ts`)
The server-side Next.js route handler inspects all JSON responses from upstream. Keys matching `mfa_secret`, `mfa_qr_code_uri`, and `enrollment_token` are recursively deleted before the response payload is returned to browser JavaScript.

### Boundary 2: Typed Zod Schema Layer (`lib/api/backend/dto.ts`)
`createHospitalResponseSanitizedSchema` explicitly excludes `mfa_secret`, `mfa_qr_code_uri`, and `enrollment_token` using a Zod transformation. The TypeScript type `CreateHospitalResponseSanitizedDto` guarantees these fields do not exist on the parsed response.

### Boundary 3: Component State & Logging
- Browser JavaScript never receives or stores `mfa_secret`, `mfa_qr_code_uri`, or `enrollment_token`.
- No logging statement, error handler, or network trace on the client captures these values.

---

## 3. Handling of `enrollment_url`

`enrollment_url` is a sensitive, single-use activation vector for the newly provisioned administrator. The Authority Console applies strict controls:
1. **Masked Display:** The URL is masked by default (`••••••••••••••••••••••••••••••••`) with an explicit "Reveal" toggle.
2. **Delivery Warning:** Accompanied by a warning: *"Single-use activation link. Deliver out-of-band to the administrator. This link is shown once and will not be displayed again."*
3. **Copy Action:** A dedicated "Copy Link" button allows safe transfer without requiring visual exposure.
4. **Ephemeral State:** The URL exists only in component React state during the active success view; it is never persisted to localStorage, sessionStorage, or URL query parameters, and is immediately discarded when the user navigates away.

---

## 4. Formal Recommendation to the Backend Team

We recommend the backend team update the ASP.NET Core `CreateHospitalResponse` contract:
1. **Remove `mfa_secret` and `mfa_qr_code_uri` completely from the admin response.**
   The platform admin has no operational need to see or manage TOTP secrets. TOTP enrollment and QR code generation must be performed strictly within the hospital administrator's own browser session at `/enrollment/complete` after identity verification.
2. **Remove `enrollment_token` from the response body.**
   The backend should provide only `enrollment_url` (or a single-use token reference), preventing raw secret proliferation.
