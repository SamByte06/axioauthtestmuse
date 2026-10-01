# Authentication

## Principle

Authority authentication is performed **exclusively by the AxioVital
backend**. The frontend holds no credentials, issues no sessions, and makes
no authentication decisions.

Forbidden in this codebase:

- hardcoded usernames / passwords
- fake / demo login paths
- frontend-only authentication (e.g. "if password === 'admin'")
- tokens in `localStorage` / `sessionStorage`
- inventing a session when the backend is unreachable

## Flow

```
Authority administrator
        │  email + password (TLS)
        ▼
POST /api/v1/authority/auth/login
        │  backend validates against the Authority identity store
        ▼
Backend sets httpOnly, Secure, SameSite session cookie
        │  (JavaScript cannot read it — XSS cannot steal it)
        ▼
Frontend calls GET /api/v1/authority/auth/session
        │  returns AuthoritySession: identity, roles, permissions
        ▼
AuthProvider holds the session in memory (React context)
```

- Session refresh / expiry is driven by the backend (`expiresAt`).
- `401` from any API call → session treated as expired → redirect to `/login`.
- Logout: `POST /api/v1/authority/auth/logout` invalidates server-side.

## Separate authorization contexts

**Authority authentication and hospital operator authentication are distinct
contexts.** A hospital administrator authenticated against a tenant is NOT
automatically an AxioVital Authority administrator. The backend issues
Authority sessions only to Authority identities, and the Authority frontend
only accepts Authority sessions.

## Unconfigured backend

If `NEXT_PUBLIC_AUTHORITY_API_BASE_URL` is not set, the login page renders
"Backend connection not configured" and sign-in is **disabled**. There is no
offline/demo bypass — by design.

## Failed attempts

Failed sign-ins are logged by the backend (`AUTHORITY_LOGIN_FAILURE`) and
surfaced in the audit log and security dashboard. The login UI never reveals
whether the email or the password was wrong.
