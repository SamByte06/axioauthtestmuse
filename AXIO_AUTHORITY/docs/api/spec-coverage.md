# AxioVital Authority — Super Admin IAM Spec Coverage Matrix

This matrix maps every requirement from the Hospital Identity & Access Management (IAM) Super Admin specification to its implementation in the AxioVital Authority control plane codebase (`AXIO_AUTHORITY`).

## Principles (P1 – P7)

| ID | Principle | Status | Implementation & Evidence |
|---|---|---|---|
| **P1** | No social or consumer login. Healthcare-specific IAM. | **DONE** | Strict password/MFA credential model with healthcare IAM boundaries. No OAuth/social providers exist in `src/app/login/page.tsx` or `packages/shared-types`. |
| **P2** | Every hospital is a registered organization (partner) with its own tenant. | **DONE** | Enforced via `Partner` entity (`packages/shared-types/src/index.ts`) and tenant orchestration (`packages/api-contracts/src/index.ts`, `docs/workflows/tenant-provisioning.md`). |
| **P3** | Every hospital administrator has an individual account. Staff have role-specific accounts. | **DONE** | Supported types `A` (Administrator), `C` (Clinician), `S` (Staff), `T` (Technician), `D` (Doctor) defined in `OPERATOR_TYPE_LABELS` (`packages/shared-types/src/index.ts:167-175`). |
| **P4** | Tenant isolation: users access only their authorized hospital & clinical data. | **OUT OF SCOPE (DATA PLANE)** | Documented in `docs/architecture/control-plane-vs-data-plane.md` and `docs/security/boundaries.md`. Authority is the control plane and strictly never accesses patient or clinical data. |
| **P5** | Admins can create, activate, deactivate, and manage staff accounts. | **DONE** | Full lifecycle implemented: create (`operatorsApi.create`), suspend (`operatorsApi.suspend`), reactivate (`operatorsApi.reactivate`), change role (`operatorsApi.updateRole`). Rendered on `operators/[operatorId]/page.tsx`. |
| **P6** | Login, logout, sessions, and audit are backed by real backend/database; frontend never fakes them. | **DONE** | Real API contracts in `packages/api-contracts/src/index.ts`. All mock data isolated to `isDemoMode()` in non-production. Zero fake success states in production UI. |
| **P7** | Desktop client auth uses central IAM (Auth Code + PKCE, central IAM architecture). | **DOCUMENTED** | Documented in `docs/security/authentication.md` and `docs/architecture/overview.md`. Client integration contract managed centrally. |

---

## Super Admin Capabilities (SA-1 – SA-10)

| ID | Capability | Status | Implementation & Evidence |
|---|---|---|---|
| **SA-1** | Register a new hospital | **DONE** | UI at `src/app/(authority)/partners/page.tsx`, contract `createPartner` (`POST /partners`), client in `partners-api.ts`. |
| **SA-2** | Generate unique Hospital ID and tenant identifier (backend-generated only) | **DONE** | Frontend never generates IDs; backend generates `AXP-{STATE}-{SUFFIX}` format. Enforced and validated via `isValidPartnerId` (`packages/shared-types/src/index.ts:50`). |
| **SA-3** | Create initial Hospital Administrator account | **DONE** | Quick action on `dashboard/page.tsx`, modal in `partners/[partnerId]/page.tsx` pre-filling partner ID and setting `type: "A"`, and `operators/page.tsx?action=provision-admin`. |
| **SA-4** | Issue secure, single-use activation invitation | **DONE** | Enrollment workflow (`POST /operators/{operatorId}/enrollment`). Returns single-use reference and expiry; never permanent secret. Displayed in `operators/[operatorId]/page.tsx`. |
| **SA-5** | Activate or deactivate a hospital | **DONE** | Suspend dialog (`POST /partners/{partnerId}/suspend`) and Activate button (`POST /partners/{partnerId}/activate`) in `partners/[partnerId]/page.tsx`. Contract permissions: `authority.partner.suspend` & `authority.partner.activate`. |
| **SA-6** | View hospital account inventory and account status | **DONE** | Account Inventory tab and table on `partners/[partnerId]/page.tsx` listing all partner operators with status and credentials, filtered via `operatorsApi.list({ partnerId })`. |
| **SA-7** | Suspend compromised or unauthorized accounts; Reactivate accounts | **DONE** | Suspend (`POST /operators/{id}/suspend`) and Reactivate (`POST /operators/{id}/reactivate`) on `operators/[operatorId]/page.tsx`. Gated with `AxioConfirmDialog` requiring $\ge 10$-character reason. |
| **SA-8** | Reset account activation and recovery workflows | **DONE** | Single-use recovery reset (`POST /operators/{id}/credential/reset`) in `operators/[operatorId]/page.tsx`. Returns reset reference and expiration time; zero cleartext credentials displayed. |
| **SA-9** | Revoke active sessions | **DONE** | Operator session revocation (`POST /operators/{id}/sessions/revoke`) and hospital-wide session revocation (`POST /partners/{id}/sessions/revoke`). Gated by `AxioConfirmDialog` with audited reason. |
| **SA-10** | View authentication and platform administration logs | **DONE** | Dedicated audit page at `src/app/(authority)/audit/page.tsx` with category tabs ("All Audit Events", "Authentication & Sessions", "Platform Administration") filtering comprehensive audit actions. |

---

## Role Assignment

| Requirement | Status | Implementation & Evidence |
|---|---|---|
| **Assign Roles** | **DONE** | Quick action on `dashboard/page.tsx`, and Change Role action on `operators/[operatorId]/page.tsx` backed by contract `updateOperatorRole` (`PATCH /operators/{operatorId}/role`). Requires `authority.operator.update`. |

---

## Dashboard Requirements (D-1 – D-4)

| ID | Requirement | Status | Implementation & Evidence |
|---|---|---|---|
| **D-1** | Summary counters: registered hospitals and total employee accounts | **DONE** | Rendered in `dashboard/page.tsx:75-103`. Displays `registeredHospitals`, `totalEmployees`, and `totalAdministrators`. Shows explicit fallback if unpopulated. |
| **D-2** | Hospital directory: name, Hospital ID, status badge, admin count, employee count | **DONE** | Hospital Directory table in `dashboard/page.tsx:135-185`. Shows `name`, `id`, `status`, `adminCount`, and `employeeCount` columns. |
| **D-3** | Action entry points: Register hospital, Provision admin, Manage users, Assign roles, Suspend access (destructive styling), View audit logs | **DONE** | Quick actions bar in `dashboard/page.tsx:107-133`. All 6 actions present with permission guards and destructive styling on "Suspend access". |
| **D-4** | Real backend figures; no hardcoded illustrative mockup data | **DONE** | `dashboard/page.tsx` displays values directly from `dashboardApi.getSummary()` and `partnersApi.list()`. If missing, shows explicit indicator: "Not reported by backend". |

