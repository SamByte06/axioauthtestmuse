# Workflow — Operator Enrollment

Operators are per-partner identities. The backend owns identity issuance;
Authority administers lifecycle.

## Operator ID

```
AXO-{PARTNER_SUFFIX}-{TYPE}{SEQUENCE}
e.g. AXO-7K42F8-A00001
```

- `{PARTNER_SUFFIX}` — the 6-character suffix of the partner's ID
- `{TYPE}` — A (Administrator), C (Clinician), S (Staff), T (Technician),
  D (Doctor)
- `{SEQUENCE}` — zero-padded 5-digit sequence per partner

The frontend validates displayed IDs against this format
(`isValidOperatorId`) and **never generates them**.

## Lifecycle

```
Create (POST /operators, backend generates ID)
  → PENDING (credential enrollment outstanding)
  → ACTIVE  (enrollment completed)
  → SUSPENDED (reversible; operator cannot sign in)
  → REVOKED   (terminal; identity retired)
```

- Suspend requires `authority.operator.suspend` + reason (audited).
- Revoke requires `authority.operator.revoke` + reason (audited, terminal).
- Both go through `AxioConfirmDialog`: consequence stated, identifier
  re-typed, reason recorded.

## Enrollment

`POST /api/v1/authority/operators/{operatorId}/enrollment`

- Creates a **secure enrollment workflow** (invitation / enrollment
  reference with expiry), not a password.
- The response contains an `enrollmentReference` for the operator and an
  expiry — never a permanent secret.
- Methods: `PASSWORD_MFA`, `AXIO_CARD` (future card administration lives
  here; no card cryptography in v1), `HARDWARE_KEY`.

## Authority vs hospital operators

A hospital operator identity belongs to a tenant and the data plane. An
Authority administrator identity belongs to the platform. Creating or
suspending a hospital operator does not confer Authority access, and
Authority sessions never impersonate tenant operators.
