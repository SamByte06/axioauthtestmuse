# Workflow — Credentials

## What Authority shows

Credential **state** only:

```
PENDING_ENROLLMENT → ACTIVE → SUSPENDED → REVOKED
                          ↘ EXPIRED
```

Displayed fields: credential ID, operator ID, partner ID, method
(`PASSWORD_MFA`, `AXIO_CARD`, `HARDWARE_KEY`), enrolled/expires/revoked
timestamps, last-used timestamp.

## What Authority never shows

Passwords, password hashes, private keys, refresh tokens, JWTs, database
passwords, AWS secrets, API secrets. This is enforced by the API contract
(the backend must not serialize them) and by UI code review (no component
renders a secret field).

## Operations

| Operation | Endpoint | Permission | Notes |
|---|---|---|---|
| List states | `GET /credentials` | `authority.credentials.read` | Filter by state / operator |
| Create enrollment | `POST /operators/{id}/enrollment` | `authority.credentials.enroll` | Returns enrollment *reference*, not a secret |
| Revoke | `POST /credentials/{id}/revoke` | `authority.credentials.revoke` | Terminal; reason required; audited |

Revocation goes through `AxioConfirmDialog` like every destructive action.

## Future: Axio Card administration

The credentials domain is the future home of Axio Card administration:

```
card enrollment · card status · activation · suspension
· replacement · revocation · device/card association
```

Card cryptography is NOT implemented until a backend contract exists, and
private card secrets must never be exposed in the UI. The current
`AXIO_CARD` enrollment method is a reserved workflow label, not an
implementation.
