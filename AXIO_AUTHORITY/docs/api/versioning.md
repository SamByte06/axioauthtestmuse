# API Versioning

- The Authority API is versioned by URL prefix: `/api/v1/authority`.
- `AUTHORITY_API_VERSION` and `AUTHORITY_API_PREFIX` are defined once in
  `packages/api-contracts` and used by every frontend API module — no
  scattered URL strings.
- Breaking changes require a new major version (`/api/v2/authority`); the
  frontend pins the version it was built and tested against.
- Additive, backward-compatible changes (new optional fields, new
  endpoints) do not require a version bump; the frontend ignores unknown
  fields.
- The contracts package is the single source of truth for endpoint paths,
  required permissions, and request/response shapes. Backend and frontend
  evolve against it, not against each other directly.
