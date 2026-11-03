/**
 * assumptions.ts — Assumptions made about the live ASP.NET Core admin backend.
 *
 * Each assumption is flagged for confirmation with the backend team.
 */

// ASSUMED: confirm with backend — B2B organizations (/api/v1/admin/organizations/b2b) share the same request/response schema as hospitals (/api/v1/admin/hospitals).
export const ASSUMED_B2B_ORG_USES_HOSPITAL_SCHEMA = true;

// ASSUMED: confirm with backend — Isolation mode accepts "DEDICATED_DATABASE", "SHARED_DATABASE", or "ISOLATED_SCHEMA".
export const ASSUMED_ISOLATION_MODES = [
  { value: "DEDICATED_DATABASE", label: "Dedicated Database" },
  { value: "SHARED_DATABASE", label: "Shared Database" },
  { value: "ISOLATED_SCHEMA", label: "Isolated Schema" },
] as const;

// ASSUMED: confirm with backend — Tenant creation via /api/v1/admin/hospitals automatically provisions the underlying tenant. Independent tenant creation at /api/v1/admin/tenants requires explicit provisioning at /api/v1/admin/tenants/provision.
export const ASSUMED_HOSPITAL_CREATION_AUTO_PROVISIONS_TENANT = true;

// ASSUMED: confirm with backend — Security events from /api/v1/admin/security-events map directly to authentication & session audit logs in the Authority console.
export const ASSUMED_SECURITY_EVENTS_MAP_TO_AUDIT = true;

// ASSUMED: confirm with backend — Disable user endpoint (/api/v1/admin/users/{id}/disable) maps to console operator suspension. The backend currently lacks a re-enable endpoint.
export const ASSUMED_DISABLE_USER_IS_SUSPENSION = true;

// ASSUMED: confirm with backend — Disable tenant endpoint (/api/v1/admin/tenants/{id}/disable) maps to console tenant suspension. The backend currently lacks a re-enable endpoint.
export const ASSUMED_DISABLE_TENANT_IS_SUSPENSION = true;

// ASSUMED: confirm with backend — User creation at /api/v1/admin/users/create-admin generates password and issues initial admin without needing immediate interactive enrollment token.
export const ASSUMED_USER_ADMIN_CREATION_DIRECT = true;
