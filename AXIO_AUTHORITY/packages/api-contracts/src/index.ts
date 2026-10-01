/**
 * @axio-authority/api-contracts
 *
 * REST API contracts for the AxioVital Authority backend (v1).
 *
 * These are CONTRACTS, not implementations. The frontend's typed API client
 * (authority-frontend/src/lib/api) is built against them; the backend owns
 * the authoritative behavior (ID generation, provisioning, credential
 * issuance, RBAC enforcement, audit emission).
 *
 * Contract status legend (see docs/api/contracts.md):
 *   IMPLEMENTED              — frontend client + UI exist
 *   BACKEND CONTRACT REQUIRED — frontend client exists; backend must implement
 *   FUTURE                    — contract drafted; not yet built anywhere
 */

import type {
  AuditEvent,
  AuthoritySession,
  CreateEnrollmentRequest,
  CreateOperatorRequest,
  CreatePartnerRequest,
  CreatePartnerResponse,
  Credential,
  EnrollmentResponse,
  Integration,
  IsoTimestamp,
  Operator,
  OperatorId,
  PaginatedResponse,
  Partner,
  PartnerId,
  SecuritySummary,
  Tenant,
} from "@axio-authority/shared-types";

export const AUTHORITY_API_VERSION = "v1";
export const AUTHORITY_API_PREFIX = `/api/${AUTHORITY_API_VERSION}/authority`;

// ---------------------------------------------------------------------------
// Endpoint catalogue
// ---------------------------------------------------------------------------

export interface EndpointContract<Req = unknown, Res = unknown> {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** Path template, e.g. "/partners/{partnerId}/suspend". */
  path: string;
  /** Build a concrete path from route params. */
  buildPath: (params: Record<string, string>) => string;
  description: string;
  /** Required backend permission (enforced server-side). */
  requiresPermission: string;
  status: "IMPLEMENTED" | "BACKEND CONTRACT REQUIRED" | "FUTURE";
}

function ep<Req, Res>(
  method: EndpointContract["method"],
  path: string,
  description: string,
  requiresPermission: string,
  status: EndpointContract["status"],
): EndpointContract<Req, Res> {
  return {
    method,
    path,
    buildPath: (params) =>
      Object.entries(params).reduce(
        (p, [k, v]) => p.replace(`{${k}}`, encodeURIComponent(v)),
        path,
      ),
    description,
    requiresPermission,
    status,
  };
}

export interface SuspendRequest {
  reason: string;
  idempotencyKey: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  session: AuthoritySession;
  /** Opaque session handle; the real tokens live in httpOnly cookies set by the backend. */
  sessionHandle: string;
}

export interface DashboardSummary {
  activePartners: number;
  pendingPartners: number;
  suspendedPartners: number;
  activeOperators: number;
  pendingEnrollments: number;
  provisioningJobs: number;
  infrastructure: Array<{
    component: string;
    state: "HEALTHY" | "WARNING" | "DEGRADED" | "OFFLINE" | "UNKNOWN";
    detail?: string;
    checkedAt: IsoTimestamp;
  }>;
}

export const AuthorityContracts = {
  // -- Authentication (backend-issued sessions only; no frontend auth) --
  login: ep<LoginRequest, LoginResponse>(
    "POST",
    "/auth/login",
    "Authenticate an Authority administrator. Issues an httpOnly session cookie.",
    "(public — rate limited)",
    "BACKEND CONTRACT REQUIRED",
  ),
  logout: ep<Record<string, never>, void>(
    "POST",
    "/auth/logout",
    "Invalidate the current Authority session.",
    "(authenticated)",
    "BACKEND CONTRACT REQUIRED",
  ),
  session: ep<Record<string, never>, AuthoritySession>(
    "GET",
    "/auth/session",
    "Return the current Authority session (identity, roles, permissions).",
    "(authenticated)",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Dashboard --
  dashboard: ep<Record<string, never>, DashboardSummary>(
    "GET",
    "/dashboard",
    "Network overview counts + infrastructure health snapshot.",
    "authority.dashboard.read",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Partners --
  createPartner: ep<CreatePartnerRequest, CreatePartnerResponse>(
    "POST",
    "/partners",
    "Create partner → generate Partner ID → create tenant → create initial operator → provision → enroll → audit, transactionally.",
    "authority.partner.create",
    "BACKEND CONTRACT REQUIRED",
  ),
  listPartners: ep<Record<string, never>, PaginatedResponse<Partner>>(
    "GET",
    "/partners",
    "List partners with pagination and status filter.",
    "authority.partner.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  getPartner: ep<Record<string, never>, Partner>(
    "GET",
    "/partners/{partnerId}",
    "Get a single partner by ID.",
    "authority.partner.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  updatePartner: ep<Partial<Partner>, Partner>(
    "PATCH",
    "/partners/{partnerId}",
    "Update mutable partner fields (contact, metadata).",
    "authority.partner.update",
    "BACKEND CONTRACT REQUIRED",
  ),
  activatePartner: ep<Record<string, never>, Partner>(
    "POST",
    "/partners/{partnerId}/activate",
    "Activate a pending partner.",
    "authority.partner.update",
    "BACKEND CONTRACT REQUIRED",
  ),
  suspendPartner: ep<SuspendRequest, Partner>(
    "POST",
    "/partners/{partnerId}/suspend",
    "Suspend a partner. Requires a reason; audited.",
    "authority.partner.suspend",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Tenants --
  listTenants: ep<Record<string, never>, PaginatedResponse<Tenant>>(
    "GET",
    "/tenants",
    "List tenants with lifecycle filter.",
    "authority.tenant.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  getTenant: ep<Record<string, never>, Tenant>(
    "GET",
    "/tenants/{tenantId}",
    "Get a single tenant by ID.",
    "authority.tenant.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  provisionTenant: ep<{ idempotencyKey: string }, Tenant>(
    "POST",
    "/tenants/{tenantId}/provision",
    "Start (or retry) tenant data-store provisioning. Backend-authoritative.",
    "authority.tenant.provision",
    "BACKEND CONTRACT REQUIRED",
  ),
  suspendTenant: ep<SuspendRequest, Tenant>(
    "POST",
    "/tenants/{tenantId}/suspend",
    "Suspend a tenant. Requires a reason; audited.",
    "authority.tenant.suspend",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Operators --
  listOperators: ep<Record<string, never>, PaginatedResponse<Operator>>(
    "GET",
    "/operators",
    "List operators with partner/status filter.",
    "authority.operator.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  createOperator: ep<CreateOperatorRequest, Operator>(
    "POST",
    "/operators",
    "Create an operator. Backend generates the Operator ID.",
    "authority.operator.create",
    "BACKEND CONTRACT REQUIRED",
  ),
  getOperator: ep<Record<string, never>, Operator>(
    "GET",
    "/operators/{operatorId}",
    "Get a single operator by ID.",
    "authority.operator.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  suspendOperator: ep<SuspendRequest, Operator>(
    "POST",
    "/operators/{operatorId}/suspend",
    "Suspend an operator. Requires a reason; audited.",
    "authority.operator.suspend",
    "BACKEND CONTRACT REQUIRED",
  ),
  revokeOperator: ep<SuspendRequest, Operator>(
    "POST",
    "/operators/{operatorId}/revoke",
    "Revoke an operator (terminal). Requires a reason; audited.",
    "authority.operator.revoke",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Credentials --
  listCredentials: ep<Record<string, never>, PaginatedResponse<Credential>>(
    "GET",
    "/credentials",
    "List credential STATES. Never returns secret values.",
    "authority.credentials.read",
    "BACKEND CONTRACT REQUIRED",
  ),
  createEnrollment: ep<CreateEnrollmentRequest, EnrollmentResponse>(
    "POST",
    "/operators/{operatorId}/enrollment",
    "Create a secure enrollment workflow for an operator.",
    "authority.credentials.enroll",
    "BACKEND CONTRACT REQUIRED",
  ),
  revokeCredential: ep<SuspendRequest, Credential>(
    "POST",
    "/credentials/{credentialId}/revoke",
    "Revoke a credential. Requires a reason; audited.",
    "authority.credentials.revoke",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Security --
  securitySummary: ep<Record<string, never>, SecuritySummary>(
    "GET",
    "/security",
    "Authentication health, sessions, enrollments, key/policy status.",
    "authority.security.read",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Audit --
  listAuditEvents: ep<Record<string, never>, PaginatedResponse<AuditEvent>>(
    "GET",
    "/audit",
    "Append-only audit log with filters (actor, action, partner, result, time range).",
    "authority.audit.read",
    "BACKEND CONTRACT REQUIRED",
  ),

  // -- Integrations --
  listIntegrations: ep<Record<string, never>, Integration[]>(
    "GET",
    "/integrations",
    "Platform integration states (backend, native, ABHA/ABDM, FHIR, HL7, DICOM…).",
    "authority.integration.read",
    "BACKEND CONTRACT REQUIRED",
  ),
} as const;

export type AuthorityContractName = keyof typeof AuthorityContracts;

/** Flat list of all contracts for documentation / contract-test generation. */
export const ALL_CONTRACTS: Array<
  EndpointContract<unknown, unknown> & { name: AuthorityContractName }
> = (Object.keys(AuthorityContracts) as AuthorityContractName[]).map((name) => ({
  name,
  ...(AuthorityContracts[name] as EndpointContract<unknown, unknown>),
}));

// Re-export request/response helpers used by the frontend client.
export type {
  CreateEnrollmentRequest,
  CreateOperatorRequest,
  CreatePartnerRequest,
  CreatePartnerResponse,
  Credential,
  EnrollmentResponse,
  Integration,
  Operator,
  OperatorId,
  Partner,
  PartnerId,
  SecuritySummary,
  Tenant,
};
export type { AuditEvent, AuthoritySession, PaginatedResponse };
