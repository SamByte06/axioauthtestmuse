/**
 * @axio-authority/shared-types
 *
 * Domain types for the AxioVital Authority control plane.
 * These types describe CONTROL-PLANE resources only (partners, tenants,
 * operators, credentials, policy, audit). They intentionally contain no
 * clinical data-plane types (patients, encounters, prescriptions, …).
 */

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

/** ISO-8601 timestamp string. */
export type IsoTimestamp = string;

/** Backend-issued correlation / request ID, e.g. "AX-REQ-9f3a2c…". */
export type CorrelationId = string;

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  correlationId?: CorrelationId;
  details?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export type PartnerStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DECOMMISSIONED";

export type PartnerType =
  | "HOSPITAL"
  | "CLINIC"
  | "LABORATORY"
  | "INSURER"
  | "PHARMACY"
  | "GOVERNMENT";

/** Tenant data isolation mode. */
export type IsolationMode = "SHARED" | "DEDICATED_DATABASE";

/**
 * Backend-authoritative partner identifier.
 * Format: AXP-{STATE}-{SUFFIX}, e.g. "AXP-KL-7K42F8".
 * The frontend MUST NOT generate this value.
 */
export type PartnerId = string;

export interface Partner {
  id: PartnerId;
  organizationName: string;
  partnerType: PartnerType;
  state: string;
  country: string;
  isolationMode: IsolationMode;
  status: PartnerStatus;
  operatorCount: number;
  tenantId: string | null;
  /** Test fixture marker. Real production partners are never flagged. */
  testFixture?: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface CreatePartnerRequest {
  organizationName: string;
  partnerType: PartnerType;
  state: string;
  country: string;
  isolationMode: IsolationMode;
  administrativeContact: {
    fullName: string;
    email: string;
    phone?: string;
  };
  /** Idempotency key generated per wizard session. */
  idempotencyKey: string;
}

export interface CreatePartnerResponse {
  partner: Partner;
  tenant: Tenant;
  initialOperator: Operator;
  correlationId: CorrelationId;
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

export type TenantLifecycle =
  | "CREATING"
  | "PROVISIONING"
  | "READY"
  | "ACTIVE"
  | "SUSPENDED"
  | "DECOMMISSIONING"
  | "DECOMMISSIONED";

export interface Tenant {
  id: string;
  partnerId: PartnerId;
  organizationName: string;
  region: string;
  isolationMode: IsolationMode;
  lifecycle: TenantLifecycle;
  provisioningStatus: ProvisioningStatus;
  operatorCount: number;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ProvisioningStatus {
  state: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ROLLED_BACK";
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
  correlationId?: CorrelationId;
  /** Administrator-facing message. Never includes infrastructure secrets. */
  message?: string;
}

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

export type OperatorType = "A" | "C" | "S" | "T" | "D";

export const OPERATOR_TYPE_LABELS: Record<OperatorType, string> = {
  A: "Administrator",
  C: "Clinician",
  S: "Staff",
  T: "Technician",
  D: "Doctor",
};

export type OperatorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";

/**
 * Backend-authoritative operator identifier.
 * Format: AXO-{PARTNER_SUFFIX}-{TYPE}{SEQUENCE}, e.g. "AXO-7K42F8-A00001".
 * The frontend MUST NOT generate this value.
 */
export type OperatorId = string;

export interface Operator {
  id: OperatorId;
  partnerId: PartnerId;
  displayName: string;
  type: OperatorType;
  status: OperatorStatus;
  email: string;
  credentialState: CredentialState;
  lastActiveAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
}

export interface CreateOperatorRequest {
  partnerId: PartnerId;
  displayName: string;
  type: OperatorType;
  email: string;
  idempotencyKey: string;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export type CredentialState =
  | "PENDING_ENROLLMENT"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED";

export interface Credential {
  id: string;
  operatorId: OperatorId;
  partnerId: PartnerId;
  state: CredentialState;
  /** Enrollment method, e.g. "PASSWORD_MFA", "AXIO_CARD". Never the secret. */
  method: string;
  enrolledAt?: IsoTimestamp;
  expiresAt?: IsoTimestamp;
  revokedAt?: IsoTimestamp;
  lastUsedAt?: IsoTimestamp;
}

export interface CreateEnrollmentRequest {
  operatorId: OperatorId;
  method: string;
  /** Hours the enrollment invitation remains valid. */
  expiresInHours: number;
  idempotencyKey: string;
}

export interface EnrollmentResponse {
  credential: Credential;
  /** One-time enrollment reference for the operator (not a password). */
  enrollmentReference: string;
  expiresAt: IsoTimestamp;
  correlationId: CorrelationId;
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export type HealthState = "HEALTHY" | "WARNING" | "DEGRADED" | "OFFLINE" | "UNKNOWN";

export interface ComponentHealth {
  component: string;
  state: HealthState;
  /** Short, non-sensitive detail, e.g. "latency 42ms". */
  detail?: string;
  checkedAt: IsoTimestamp;
}

export interface SecuritySummary {
  authentication: ComponentHealth;
  failedAuthAttempts24h: number;
  activeAuthoritySessions: number;
  pendingEnrollments: number;
  revokedCredentials: number;
  suspendedOperators: number;
  keyStatus: ComponentHealth;
  policyStatus: ComponentHealth;
  recentSecurityEvents: SecurityEvent[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  actor?: string;
  resource?: string;
  occurredAt: IsoTimestamp;
  correlationId?: CorrelationId;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditAction =
  | "PARTNER_CREATED"
  | "PARTNER_ACTIVATED"
  | "PARTNER_SUSPENDED"
  | "PARTNER_DECOMMISSIONED"
  | "TENANT_CREATED"
  | "TENANT_PROVISIONING_STARTED"
  | "TENANT_PROVISIONING_COMPLETED"
  | "TENANT_PROVISIONING_FAILED"
  | "TENANT_SUSPENDED"
  | "OPERATOR_CREATED"
  | "OPERATOR_ACTIVATED"
  | "OPERATOR_SUSPENDED"
  | "OPERATOR_REVOKED"
  | "CREDENTIAL_ENROLLMENT_CREATED"
  | "CREDENTIAL_ACTIVATED"
  | "CREDENTIAL_REVOKED"
  | "SECURITY_EVENT_CREATED"
  | "AUTHORITY_LOGIN_SUCCESS"
  | "AUTHORITY_LOGIN_FAILURE"
  | "AUTHORITY_LOGOUT";

export type AuditResult = "SUCCESS" | "FAILURE" | "DENIED";

export interface AuditEvent {
  id: string;
  timestamp: IsoTimestamp;
  actor: string;
  action: AuditAction;
  resource: string;
  partnerId?: PartnerId;
  result: AuditResult;
  correlationId?: CorrelationId;
  source: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export type IntegrationStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED";

export interface Integration {
  id: string;
  name: string;
  category: "PLATFORM" | "INTEROPERABILITY" | "EXTERNAL";
  status: IntegrationStatus;
  version?: string;
  lastSynchronizedAt?: IsoTimestamp;
  health: HealthState;
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Authority identity / RBAC
// ---------------------------------------------------------------------------

export type AuthorityRole =
  | "SUPER_AUTHORITY_ADMIN"
  | "AUTHORITY_ADMIN"
  | "SECURITY_ADMIN"
  | "PARTNER_ADMIN"
  | "AUDITOR"
  | "READ_ONLY_AUTHORITY";

/**
 * Platform permissions enforced by the BACKEND on every request.
 * Frontend visibility mirrors these but is never the security boundary.
 */
export type AuthorityPermission =
  | "authority.dashboard.read"
  | "authority.partner.read"
  | "authority.partner.create"
  | "authority.partner.update"
  | "authority.partner.suspend"
  | "authority.tenant.read"
  | "authority.tenant.provision"
  | "authority.tenant.suspend"
  | "authority.operator.read"
  | "authority.operator.create"
  | "authority.operator.suspend"
  | "authority.operator.revoke"
  | "authority.credentials.read"
  | "authority.credentials.enroll"
  | "authority.credentials.revoke"
  | "authority.audit.read"
  | "authority.security.read"
  | "authority.integration.read"
  | "authority.integration.manage";

export interface AuthoritySession {
  administratorId: string;
  displayName: string;
  email: string;
  roles: AuthorityRole[];
  permissions: AuthorityPermission[];
  issuedAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
}

/** Least-privilege default permission sets per role (mirrors backend). */
export const ROLE_PERMISSIONS: Record<AuthorityRole, AuthorityPermission[]> = {
  SUPER_AUTHORITY_ADMIN: [
    "authority.dashboard.read",
    "authority.partner.read",
    "authority.partner.create",
    "authority.partner.update",
    "authority.partner.suspend",
    "authority.tenant.read",
    "authority.tenant.provision",
    "authority.tenant.suspend",
    "authority.operator.read",
    "authority.operator.create",
    "authority.operator.suspend",
    "authority.operator.revoke",
    "authority.credentials.read",
    "authority.credentials.enroll",
    "authority.credentials.revoke",
    "authority.audit.read",
    "authority.security.read",
    "authority.integration.read",
    "authority.integration.manage",
  ],
  AUTHORITY_ADMIN: [
    "authority.dashboard.read",
    "authority.partner.read",
    "authority.partner.create",
    "authority.partner.update",
    "authority.tenant.read",
    "authority.tenant.provision",
    "authority.operator.read",
    "authority.operator.create",
    "authority.credentials.read",
    "authority.credentials.enroll",
    "authority.audit.read",
    "authority.security.read",
    "authority.integration.read",
  ],
  SECURITY_ADMIN: [
    "authority.dashboard.read",
    "authority.partner.read",
    "authority.operator.read",
    "authority.operator.suspend",
    "authority.operator.revoke",
    "authority.credentials.read",
    "authority.credentials.enroll",
    "authority.credentials.revoke",
    "authority.audit.read",
    "authority.security.read",
  ],
  PARTNER_ADMIN: [
    "authority.dashboard.read",
    "authority.partner.read",
    "authority.partner.create",
    "authority.partner.update",
    "authority.tenant.read",
    "authority.operator.read",
    "authority.operator.create",
    "authority.credentials.read",
    "authority.credentials.enroll",
    "authority.audit.read",
  ],
  AUDITOR: ["authority.dashboard.read", "authority.audit.read", "authority.security.read"],
  READ_ONLY_AUTHORITY: [
    "authority.dashboard.read",
    "authority.partner.read",
    "authority.tenant.read",
    "authority.operator.read",
    "authority.credentials.read",
    "authority.audit.read",
    "authority.security.read",
    "authority.integration.read",
  ],
};
