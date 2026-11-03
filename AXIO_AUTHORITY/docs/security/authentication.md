# Authentication

## Principle

Authority authentication is performed **exclusively by the AxioVital
backend**. The frontend holds no credentials, issues no sessions, and makes
no authentication decisions.

Forbidden in this codebase:

- hardcoded usernames / passwords
- fake / demo login paths in production
- frontend-only authentication (e.g. "if password === 'admin'")
- tokens in `localStorage` / `sessionStorage`
- inventing a session when the backend is unreachable

## Architecture & Flow (BFF Pattern)

```
Authority administrator
        │  email + password (TLS)
        ▼
POST /api/backend/api/v1/auth/login (Next.js server-side route handler)
        │  forwards credentials to BACKEND_API_BASE_URL (AUTHORITY_LOGIN_PATH)
        ▼
ASP.NET Core backend issues JWT (accessToken) in response body
        │
Next.js proxy stores JWT in HttpOnly; Secure; SameSite=Lax cookie
        │  (JavaScript never sees the JWT — immune to client-side token exfiltration)
        ▼
Proxy returns sanitized session summary: identity, roles, permissions, expiresAt
        ▼
AuthProvider holds the session in memory (React context)
```

- Target backend configured via server-only `BACKEND_API_BASE_URL` (never exposed to browser JavaScript).
- Login endpoint configurable via `AUTHORITY_LOGIN_PATH` (defaults to `/api/v1/auth/login`).
- Session cookie name configured via `AUTHORITY_SESSION_COOKIE_NAME` (defaults to `axio_authority_session`).
- Session refresh / validation calls `GET /api/v1/auth/me` with `Authorization: Bearer <cookieToken>`.
- `401` from any API call → clears session cookie → redirect to `/login`.
- Logout: `POST /api/v1/auth/logout` invalidates upstream and deletes the cookie.

## Separate authorization contexts

**Authority authentication and hospital operator authentication are distinct
contexts.** A hospital administrator authenticated against a tenant is NOT
automatically an AxioVital Authority administrator. The backend issues
Authority sessions only to Authority identities, and the Authority frontend
only accepts Authority sessions.

## Unconfigured backend

If `BACKEND_API_BASE_URL` is not set and demo mode is not active,
the proxy returns `503 BACKEND_NOT_CONFIGURED` and the login page renders
"Backend connection not configured". There is no offline sign-in bypass — by design.

## Demo mode boundaries

Demo mode is strictly an opt-in local development feature (`NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true`
in uncommitted `.env.local`). It is blocked completely in production environments
(`process.env.NODE_ENV === "production"` or `process.env.NEXT_PUBLIC_VERCEL_ENV === "production"`).
When active, every page displays a persistent amber DEMO banner, the login form clearly states that
credentials sign in to an in-memory fictional administrator, and no real credentials or data exist.
