# Backend API Mapping Matrix (AxioVital ASP.NET Core Admin API)

Mapping between the live ASP.NET Core Admin API (`/api/v1/admin/*`, `/api/v1/auth/*`) and the AxioVital Authority frontend console.

Live OpenAPI Specification discovered at: `https://api.quantaforze.com/swagger/v1/swagger.json` (Swagger Title: *AxioVital API v1*).

## Confirmed & Assumed Endpoints

| Method & Path | Console Feature | Request Shape | Response Shape | Required Permission / Role | Status |
|---|---|---|---|---|---|
| `POST /api/v1/admin/hospitals` | Hospital Registration (`partners/new`) | `CreateHospitalRequest` (`hospitalName`, `state`, `isolationMode`, `administratorEmail`, `administratorFirstName`, `administratorLastName`, `identifier`) | `CreateHospitalResponse` (snake_case: `organization`, `partner_id`, `operator_id`, `tenant_status`, `isolation_mode`, `tenant_id`, `operator_type`, `administrator_user_id`, `administrator_email`, `enrollment_token`, `enrollment_url`, `mfa_secret`, `mfa_qr_code_uri`, `created_at_utc`) | `authority.partner.create` | **CONFIRMED** |
| `POST /api/v1/admin/organizations/b2b` | Non-Hospital B2B Org (`partners/new`) | `CreateHospitalRequest` | `CreateHospitalResponse` | `authority.partner.create` | **CONFIRMED** |
| `POST /api/v1/admin/tenants` | Create Tenant (`/tenants`) | `CreateTenantRequest` (`name`, `organizationName`, `identifier`, `organizationId`, `partnerId`, `stateCode`, `isolationMode`, `region`, `dataResidency`) | `TenantDto` (`id`, `name`, `organizationName`, `identifier`, `partnerId`, `stateCode`, `isolationMode`, `status`, `region`, `dataResidency`, `isActive`, `createdAtUtc`) | `authority.tenant.provision` | **CONFIRMED** |
| `POST /api/v1/admin/tenants/provision` | Provision Tenant (`tenants/[tenantId]`) | `TenantProvisioningRequest` (`name`, `organizationName`, `identifier`, `organizationId`, `stateCode`, `isolationMode`, `region`, `dataResidency`) | `TenantProvisioningResponse` (`success`, `tenantId`, `partnerId`, `name`, `identifier`, `isolationMode`, `databaseName`, `databaseReference`, `status`, `message`, `createdAtUtc`) | `authority.tenant.provision` | **CONFIRMED** |
| `GET /api/v1/admin/tenants/{id}` | View Tenant (`tenants/[tenantId]`) | None (path parameter `id: uuid`) | `TenantDto` | `authority.tenant.read` | **CONFIRMED** |
| `POST /api/v1/admin/tenants/{id}/disable` | Disable Tenant (`tenants/[tenantId]`) | Optional body / query | Status 200/204 | `authority.tenant.suspend` | **CONFIRMED** |
| `POST /api/v1/admin/users/create-admin` | Provision Hospital Admin (`partners/[partnerId]`) | `CreateB2bAdminRequest` (`tenantId`, `email`, `username`, `firstName`, `lastName`, `password`, `requireMfa`) | `UserAdminDto` (`id`, `axioId`, `operatorId`, `operatorType`, `username`, `email`, `firstName`, `lastName`, `status`, `isActive`, `mfaEnabled`, `roles`) | `authority.operator.create` | **CONFIRMED** |
| `POST /api/v1/admin/users/invite` | Invite Operator (`operators/new`, enrollment) | `InviteUserRequest` (`tenantId`, `email`, `initialRoleName`) | `EnrollmentInvitationDto` (`invitationId`, `tenantId`, `email`, `initialRoleName`, `invitationToken`, `expiresAtUtc`) | `authority.credentials.enroll` | **CONFIRMED** |
| `POST /api/v1/admin/users/{id}/disable` | Suspend Operator (`operators/[operatorId]`) | Optional body / query | Status 200/204 | `authority.operator.suspend` | **CONFIRMED** |
| `GET /api/v1/admin/users/{id}/roles` | View Operator Roles (`operators/[operatorId]`) | None (path parameter `id: uuid`) | `string[]` (role names) | `authority.operator.read` | **CONFIRMED** |
| `POST /api/v1/admin/users/{id}/roles` | Assign Role (`operators/[operatorId]`) | `AssignRoleRequest` (`roleId: uuid`) | Status 200/204 | `authority.operator.update` | **CONFIRMED** |
| `DELETE /api/v1/admin/users/{id}/roles/{roleId}` | Remove Role (`operators/[operatorId]`) | None (path parameters `id`, `roleId`) | Status 200/204 | `authority.operator.update` | **CONFIRMED** |
| `GET /api/v1/admin/security-events` | Security Events (`/security`, `/audit`) | None (or query params) | `SecurityEventDto[]` (`id`, `tenantId`, `eventType`, `actorId`, `actorEmail`, `targetResource`, `ipAddress`, `userAgent`, `timestampUtc`, `detailsJson`) | `authority.security.read` | **CONFIRMED** |
| `POST /api/v1/admin/credentials/{userId}/reset` | Reset Credential (`operators/[operatorId]`) | `ResetCredentialRequest` (`newPassword`) | Status 200/204 | `authority.credentials.enroll` | **CONFIRMED** |
| `POST /api/v1/auth/login` | Authority Login (`/login`) | `LoginRequest` (`email`, `username`, `password`, `tenantIdentifier`, `identifier`, `mfaCode`, `challengeId`) | `AuthResponse` (`accessToken`, `refreshToken`, `expiresAtUtc`, `userId`, `axioId`, `email`, `fullName`, `roles`, `permissions`, `sessionId`) | Public | **CONFIRMED** |
| `GET /api/v1/auth/me` | Session Validation (`/auth/session`) | None (Bearer token in Authorization header) | `AuthResponse` or `UserAdminDto` | Authenticated | **CONFIRMED** |
| `POST /api/v1/auth/logout` | Authority Logout | None (Bearer token in Authorization header) | Status 200/204 | Authenticated | **CONFIRMED** |

**Confirmed endpoints count:** 17  
**Assumed endpoints count:** 0 (all 17 discovered and verified directly in live OpenAPI spec)

---

## Known Gaps (Backend Contract Required)

The following capabilities are expected by the Authority Console but are missing from the backend `/api/v1/admin/*` API:

| # | Missing Capability | Expected Path | Impact on Console |
|---|---|---|---|
| 1 | List hospitals / organizations | `GET /api/v1/admin/hospitals` | `partners` page cannot list real hospitals from backend. |
| 2 | Get hospital details | `GET /api/v1/admin/hospitals/{id}` | `partners/[partnerId]` detail view cannot fetch real hospital record. |
| 3 | Activate / reactivate hospital | `POST /api/v1/admin/hospitals/{id}/activate` | Cannot reactivate a suspended partner. |
| 4 | Suspend hospital / organization | `POST /api/v1/admin/hospitals/{id}/suspend` | Cannot deactivate a hospital organization. |
| 5 | Re-enable tenant | `POST /api/v1/admin/tenants/{id}/enable` | Once a tenant is disabled via `/disable`, there is no API to re-enable it. |
| 6 | List operators / users | `GET /api/v1/admin/users` | `operators` page cannot list real users across partners. |
| 7 | Get user / operator details | `GET /api/v1/admin/users/{id}` | `operators/[operatorId]` detail view cannot fetch operator profile. |
| 8 | Re-enable operator | `POST /api/v1/admin/users/{id}/enable` | Once a user is disabled via `/disable`, there is no API to re-enable them. |
| 9 | Revoke active user sessions | `POST /api/v1/admin/users/{id}/sessions/revoke` | Cannot terminate compromised user sessions. |
| 10 | Revoke active organization sessions | `POST /api/v1/admin/organizations/{id}/sessions/revoke` | Cannot terminate all sessions across a compromised hospital. |
| 11 | Platform administration audit log | `GET /api/v1/admin/audit` | Platform administrative actions (create hospital, disable tenant) are separate from security events. |
| 12 | Dashboard summary counters | `GET /api/v1/admin/dashboard` | Dashboard summary metrics (registered hospitals, total employee accounts) must be reported by backend. |
| 13 | List credential inventory | `GET /api/v1/admin/credentials` | Credentials screen cannot list credential inventory. |
