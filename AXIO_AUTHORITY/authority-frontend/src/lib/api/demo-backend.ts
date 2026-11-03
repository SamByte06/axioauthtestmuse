/**
 * demo-backend.ts — in-memory DEMO backend for AxioVital Authority.
 *
 * DEMO MODE ONLY. This module is reachable exclusively through apiFetch when
 * NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true. It is never used in production:
 * when the flag is off, apiFetch talks to the real backend (or fails loudly
 * if none is configured) and this module is never loaded.
 *
 * What it is:
 *  - An in-memory stand-in that plays the backend's role so a human can
 *    click through the console's UI, forms, and workflows.
 *  - It serves ONLY clearly-labeled TEST fixture data (the documented
 *    Medanta (TEST) fixture) and marks every created record testFixture.
 *
 * What it is NOT:
 *  - Not a mock of provisioning: demo tenant provisioning completes
 *    instantly and says so explicitly.
 *  - Not real authentication: any valid-form credentials sign in as the
 *    demo administrator. The sign-in page identifies demo mode inline.
 *  - State resets on every page reload (in-memory by design).
 */

import type {
  ApiErrorBody,
  AuditAction,
  AuditEvent,
  AuditResult,
  AuthoritySession,
  CreateEnrollmentRequest,
  CreateOperatorRequest,
  CreatePartnerRequest,
  CreatePartnerResponse,
  Credential,
  CredentialState,
  EnrollmentResponse,
  Integration,
  Operator,
  OperatorId,
  OperatorStatus,
  OperatorType,
  PaginatedResponse,
  Partner,
  PartnerId,
  PartnerStatus,
  SecuritySummary,
  Tenant,
} from "@axio-authority/shared-types";
import type {
  DashboardSummary,
  LoginRequest,
  LoginResponse,
  SuspendRequest,
} from "@axio-authority/api-contracts";
import { ROLE_PERMISSIONS } from "@axio-authority/shared-types";
import { AuthorityApiError, type ApiRequestOptions } from "./client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEMO_ACTOR = "demo-administrator";

function nowIso(): string {
  return new Date().toISOString();
}

function demoCorrelationId(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "0");
  return `AX-REQ-DEMO-${rand}`;
}

/** Generate a backend-style partner suffix: exactly 2 letters + 4 digits, any order. */
function randomPartnerSuffix(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const chars: string[] = [];
  for (let i = 0; i < 2; i++) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    chars.push(letter as string);
  }
  for (let i = 0; i < 4; i++) {
    const digit = digits[Math.floor(Math.random() * digits.length)];
    chars.push(digit as string);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = chars[i] as string;
    const b = chars[j] as string;
    chars[i] = b;
    chars[j] = a;
  }
  return chars.join("");
}

interface DemoStore {
  session: AuthoritySession | null;
  partners: Partner[];
  tenants: Tenant[];
  operators: Operator[];
  credentials: Credential[];
  audit: AuditEvent[];
  integrations: Integration[];
  seq: number;
}

function buildFixtures(): DemoStore {
  const t0 = "2026-09-30T10:00:00.000Z";
  return {
    session: null,
    seq: 100,
    partners: [
      {
        id: "AXP-KL-7K42F8",
        organizationName: "Medanta (TEST)",
        partnerType: "HOSPITAL",
        state: "KL",
        country: "India",
        isolationMode: "DEDICATED_DATABASE",
        status: "ACTIVE",
        operatorCount: 2,
        tenantId: "tnt-demo-1",
        testFixture: true,
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: "AXP-TN-KX4207",
        organizationName: "CityCare Clinics (TEST)",
        partnerType: "CLINIC",
        state: "TN",
        country: "India",
        isolationMode: "SHARED",
        status: "PENDING",
        operatorCount: 1,
        tenantId: "tnt-demo-2",
        testFixture: true,
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: "AXP-MH-QM2041",
        organizationName: "Nova Diagnostics (TEST)",
        partnerType: "LABORATORY",
        state: "MH",
        country: "India",
        isolationMode: "SHARED",
        status: "SUSPENDED",
        operatorCount: 1,
        tenantId: "tnt-demo-3",
        testFixture: true,
        createdAt: t0,
        updatedAt: t0,
      },
    ],
    tenants: [
      {
        id: "tnt-demo-1",
        partnerId: "AXP-KL-7K42F8",
        organizationName: "Medanta (TEST)",
        region: "ap-south-1",
        isolationMode: "DEDICATED_DATABASE",
        lifecycle: "ACTIVE",
        provisioningStatus: {
          state: "COMPLETED",
          startedAt: t0,
          completedAt: t0,
          correlationId: "AX-REQ-DEMO-FIXTURE1",
          message: "Demo tenant provisioned (fixture). No real infrastructure.",
        },
        operatorCount: 2,
        status: "ACTIVE",
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: "tnt-demo-2",
        partnerId: "AXP-TN-KX4207",
        organizationName: "CityCare Clinics (TEST)",
        region: "ap-south-1",
        isolationMode: "SHARED",
        lifecycle: "PROVISIONING",
        provisioningStatus: {
          state: "IN_PROGRESS",
          startedAt: t0,
          correlationId: "AX-REQ-DEMO-FIXTURE2",
          message: "Demo provisioning in progress (fixture).",
        },
        operatorCount: 1,
        status: "ACTIVE",
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: "tnt-demo-3",
        partnerId: "AXP-MH-QM2041",
        organizationName: "Nova Diagnostics (TEST)",
        region: "ap-south-1",
        isolationMode: "SHARED",
        lifecycle: "SUSPENDED",
        provisioningStatus: {
          state: "COMPLETED",
          startedAt: t0,
          completedAt: t0,
          correlationId: "AX-REQ-DEMO-FIXTURE3",
          message: "Demo tenant provisioned (fixture), later suspended.",
        },
        operatorCount: 1,
        status: "SUSPENDED",
        createdAt: t0,
        updatedAt: t0,
      },
    ],
    operators: [
      {
        id: "AXO-7K42F8-A00001",
        partnerId: "AXP-KL-7K42F8",
        displayName: "Asha Nair (TEST)",
        type: "A",
        status: "ACTIVE",
        email: "asha.nair@example.test",
        credentialState: "ACTIVE",
        lastActiveAt: t0,
        createdAt: t0,
      },
      {
        id: "AXO-7K42F8-C00002",
        partnerId: "AXP-KL-7K42F8",
        displayName: "Ravi Menon (TEST)",
        type: "C",
        status: "ACTIVE",
        email: "ravi.menon@example.test",
        credentialState: "ACTIVE",
        lastActiveAt: t0,
        createdAt: t0,
      },
      {
        id: "AXO-KX4207-A00001",
        partnerId: "AXP-TN-KX4207",
        displayName: "Priya Rao (TEST)",
        type: "A",
        status: "PENDING",
        email: "priya.rao@example.test",
        credentialState: "PENDING_ENROLLMENT",
        createdAt: t0,
      },
      {
        id: "AXO-QM2041-S00001",
        partnerId: "AXP-MH-QM2041",
        displayName: "Vikram Shah (TEST)",
        type: "S",
        status: "SUSPENDED",
        email: "vikram.shah@example.test",
        credentialState: "SUSPENDED",
        createdAt: t0,
      },
    ],
    credentials: [
      {
        id: "cred-demo-1",
        operatorId: "AXO-7K42F8-A00001",
        partnerId: "AXP-KL-7K42F8",
        state: "ACTIVE",
        method: "PASSWORD_MFA",
        enrolledAt: t0,
        lastUsedAt: t0,
      },
      {
        id: "cred-demo-2",
        operatorId: "AXO-7K42F8-C00002",
        partnerId: "AXP-KL-7K42F8",
        state: "ACTIVE",
        method: "PASSWORD_MFA",
        enrolledAt: t0,
        lastUsedAt: t0,
      },
      {
        id: "cred-demo-3",
        operatorId: "AXO-KX4207-A00001",
        partnerId: "AXP-TN-KX4207",
        state: "PENDING_ENROLLMENT",
        method: "AXIO_CARD",
        expiresAt: "2026-10-07T10:00:00.000Z",
      },
    ],
    audit: [
      {
        id: "aud-demo-1",
        timestamp: t0,
        actor: DEMO_ACTOR,
        action: "PARTNER_CREATED",
        resource: "AXP-KL-7K42F8",
        partnerId: "AXP-KL-7K42F8",
        result: "SUCCESS",
        correlationId: "AX-REQ-DEMO-FIXTURE1",
        source: "demo-fixture",
      },
      {
        id: "aud-demo-2",
        timestamp: t0,
        actor: DEMO_ACTOR,
        action: "TENANT_PROVISIONING_COMPLETED",
        resource: "tnt-demo-1",
        partnerId: "AXP-KL-7K42F8",
        result: "SUCCESS",
        correlationId: "AX-REQ-DEMO-FIXTURE1",
        source: "demo-fixture",
      },
      {
        id: "aud-demo-3",
        timestamp: t0,
        actor: DEMO_ACTOR,
        action: "PARTNER_SUSPENDED",
        resource: "AXP-MH-QM2041",
        partnerId: "AXP-MH-QM2041",
        result: "SUCCESS",
        source: "demo-fixture",
        reason: "Demo fixture: suspended for policy review.",
      },
      {
        id: "aud-demo-4",
        timestamp: t0,
        actor: DEMO_ACTOR,
        action: "CREDENTIAL_ENROLLMENT_CREATED",
        resource: "cred-demo-3",
        partnerId: "AXP-TN-KX4207",
        result: "SUCCESS",
        source: "demo-fixture",
      },
    ],
    integrations: [
      {
        id: "int-demo-native",
        name: "AxioVital Native",
        category: "PLATFORM",
        status: "CONFIGURED",
        version: "demo-1.0",
        health: "HEALTHY",
        configured: true,
        lastSynchronizedAt: t0,
      },
      {
        id: "int-demo-abha",
        name: "ABHA / ABDM",
        category: "INTEROPERABILITY",
        status: "NOT_CONFIGURED",
        health: "UNKNOWN",
        configured: false,
      },
      {
        id: "int-demo-fhir",
        name: "FHIR Gateway",
        category: "INTEROPERABILITY",
        status: "NOT_CONFIGURED",
        health: "UNKNOWN",
        configured: false,
      },
      {
        id: "int-demo-card",
        name: "Axio Card Issuance",
        category: "PLATFORM",
        status: "NOT_CONFIGURED",
        health: "UNKNOWN",
        configured: false,
      },
    ],
  };
}

let store: DemoStore = buildFixtures();

/** Reset the demo store to its fixtures. Demo/test use only. */
export function resetDemoBackend(): void {
  store = buildFixtures();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(
  status: number,
  code: string,
  message: string,
  correlationId?: string,
): never {
  const body: ApiErrorBody = { code, message, correlationId };
  throw new AuthorityApiError(status, body, message);
}

function requireSession(): AuthoritySession {
  if (!store.session) {
    fail(401, "DEMO_NOT_AUTHENTICATED", "Your demo session has expired. Sign in again.");
  }
  return store.session as AuthoritySession;
}

function appendAudit(
  action: AuditAction,
  resource: string,
  result: AuditResult,
  extra?: Partial<AuditEvent>,
): AuditEvent {
  const event: AuditEvent = {
    id: `aud-demo-${store.seq++}`,
    timestamp: nowIso(),
    actor: store.session?.displayName ?? DEMO_ACTOR,
    action,
    resource,
    result,
    correlationId: demoCorrelationId(),
    source: "demo-backend",
    ...extra,
  };
  store.audit.unshift(event);
  return event;
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const safePage = Math.max(1, page || 1);
  const safeSize = Math.min(100, Math.max(1, pageSize || 25));
  const start = (safePage - 1) * safeSize;
  return {
    data: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total: items.length,
  };
}

function uniqueSuffix(): string {
  let suffix = randomPartnerSuffix();
  while (store.partners.some((p) => p.id.endsWith(suffix))) {
    suffix = randomPartnerSuffix();
  }
  return suffix;
}

function nextOperatorId(partnerId: PartnerId, type: OperatorType): OperatorId {
  const suffix = partnerId.split("-")[2] ?? "DEM000";
  const existing = store.operators.filter((o) => o.id.startsWith(`AXO-${suffix}-${type}`));
  const seq = String(existing.length + 1).padStart(5, "0");
  return `AXO-${suffix}-${type}${seq}`;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleLogin(body: LoginRequest | undefined): LoginResponse {
  if (!body?.email || !body?.password) {
    fail(422, "DEMO_INVALID_CREDENTIALS", "Email and password are required.");
  }
  const issuedAt = nowIso();
  const session: AuthoritySession = {
    administratorId: "demo-admin-1",
    displayName: "Demo Administrator",
    email: body.email,
    roles: ["SUPER_AUTHORITY_ADMIN"],
    permissions: ROLE_PERMISSIONS.SUPER_AUTHORITY_ADMIN,
    issuedAt,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
  store.session = session;
  appendAudit("AUTHORITY_LOGIN_SUCCESS", session.administratorId, "SUCCESS");
  return { session, sessionHandle: "demo-session" };
}

function handleDashboard(): DashboardSummary {
  const activePartners = store.partners.filter((p) => p.status === "ACTIVE").length;
  const pendingPartners = store.partners.filter((p) => p.status === "PENDING").length;
  const suspendedPartners = store.partners.filter((p) => p.status === "SUSPENDED").length;
  const activeOperators = store.operators.filter((o) => o.status === "ACTIVE").length;
  const pendingEnrollments = store.credentials.filter(
    (c) => c.state === "PENDING_ENROLLMENT",
  ).length;
  const provisioningJobs = store.tenants.filter(
    (t) => t.provisioningStatus.state === "IN_PROGRESS",
  ).length;
  return {
    activePartners,
    pendingPartners,
    suspendedPartners,
    activeOperators,
    pendingEnrollments,
    provisioningJobs,
    infrastructure: [
      {
        component: "demo-backend",
        state: "HEALTHY",
        detail: "Demo mode: in-memory fixture data. No real backend connected.",
        checkedAt: nowIso(),
      },
    ],
  };
}

function handleListPartners(query: URLSearchParams): PaginatedResponse<Partner> {
  requireSession();
  let items = [...store.partners];
  const status = query.get("status") as PartnerStatus | null;
  const search = query.get("search")?.toLowerCase();
  if (status) items = items.filter((p) => p.status === status);
  if (search) {
    items = items.filter(
      (p) =>
        p.id.toLowerCase().includes(search) ||
        p.organizationName.toLowerCase().includes(search),
    );
  }
  return paginate(items, Number(query.get("page") ?? 1), Number(query.get("pageSize") ?? 25));
}

function handleCreatePartner(body: CreatePartnerRequest | undefined): CreatePartnerResponse {
  requireSession();
  if (!body?.organizationName || !body?.state || !body?.administrativeContact?.email) {
    fail(422, "DEMO_INVALID_REQUEST", "Organization name, state, and administrative contact email are required.");
  }
  const correlationId = demoCorrelationId();
  const suffix = uniqueSuffix();
  const stateCode = (body.state as string).trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "XX";
  const partnerId: PartnerId = `AXP-${stateCode}-${suffix}`;
  const tenantId = `tnt-demo-${store.seq++}`;
  const operatorId = `AXO-${suffix}-A00001`;
  const ts = nowIso();

  const partner: Partner = {
    id: partnerId,
    organizationName: body.organizationName as string,
    partnerType: body.partnerType,
    state: body.state as string,
    country: body.country as string,
    isolationMode: body.isolationMode,
    status: "ACTIVE",
    operatorCount: 1,
    tenantId,
    testFixture: true,
    createdAt: ts,
    updatedAt: ts,
  };
  const tenant: Tenant = {
    id: tenantId,
    partnerId,
    organizationName: partner.organizationName,
    region: "ap-south-1",
    isolationMode: partner.isolationMode,
    lifecycle: "ACTIVE",
    provisioningStatus: {
      state: "COMPLETED",
      startedAt: ts,
      completedAt: ts,
      correlationId,
      message: "Demo provisioning completed instantly. No real infrastructure was touched.",
    },
    operatorCount: 1,
    status: "ACTIVE",
    createdAt: ts,
    updatedAt: ts,
  };
  const operator: Operator = {
    id: operatorId,
    partnerId,
    displayName: (body.administrativeContact as { fullName: string }).fullName,
    type: "A",
    status: "ACTIVE",
    email: (body.administrativeContact as { email: string }).email,
    credentialState: "PENDING_ENROLLMENT",
    createdAt: ts,
  };
  const credential: Credential = {
    id: `cred-demo-${store.seq++}`,
    operatorId,
    partnerId,
    state: "PENDING_ENROLLMENT",
    method: "PASSWORD_MFA",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  store.partners.unshift(partner);
  store.tenants.unshift(tenant);
  store.operators.unshift(operator);
  store.credentials.unshift(credential);

  appendAudit("PARTNER_CREATED", partnerId, "SUCCESS", { partnerId, correlationId });
  appendAudit("TENANT_CREATED", tenantId, "SUCCESS", { partnerId, correlationId });
  appendAudit("TENANT_PROVISIONING_COMPLETED", tenantId, "SUCCESS", { partnerId, correlationId });
  appendAudit("OPERATOR_CREATED", operatorId, "SUCCESS", { partnerId, correlationId });

  return { partner, tenant, initialOperator: operator, correlationId };
}

function findPartner(id: string): Partner {
  const partner = store.partners.find((p) => p.id === id);
  if (!partner) fail(404, "DEMO_PARTNER_NOT_FOUND", `Partner ${id} was not found.`);
  return partner as Partner;
}

function handleSuspendPartner(id: string, body: SuspendRequest | undefined): Partner {
  requireSession();
  const partner = findPartner(id);
  if (partner.status === "SUSPENDED") {
    fail(409, "DEMO_ALREADY_SUSPENDED", `Partner ${id} is already suspended.`);
  }
  partner.status = "SUSPENDED";
  partner.updatedAt = nowIso();
  appendAudit("PARTNER_SUSPENDED", id, "SUCCESS", {
    partnerId: id,
    reason: body?.reason,
  });
  return partner;
}

function handleActivatePartner(id: string): Partner {
  requireSession();
  const partner = findPartner(id);
  partner.status = "ACTIVE";
  partner.updatedAt = nowIso();
  appendAudit("PARTNER_ACTIVATED", id, "SUCCESS", { partnerId: id });
  return partner;
}

function handleListTenants(query: URLSearchParams): PaginatedResponse<Tenant> {
  requireSession();
  let items = [...store.tenants];
  const search = query.get("search")?.toLowerCase();
  const partnerId = query.get("partnerId");
  if (partnerId) items = items.filter((t) => t.partnerId === partnerId);
  if (search) {
    items = items.filter(
      (t) =>
        t.id.toLowerCase().includes(search) ||
        t.organizationName.toLowerCase().includes(search),
    );
  }
  return paginate(items, Number(query.get("page") ?? 1), Number(query.get("pageSize") ?? 25));
}

function findTenant(id: string): Tenant {
  const tenant = store.tenants.find((t) => t.id === id);
  if (!tenant) fail(404, "DEMO_TENANT_NOT_FOUND", `Tenant ${id} was not found.`);
  return tenant as Tenant;
}

function handleProvisionTenant(id: string): Tenant {
  requireSession();
  const tenant = findTenant(id);
  const correlationId = demoCorrelationId();
  tenant.lifecycle = "ACTIVE";
  tenant.status = "ACTIVE";
  tenant.provisioningStatus = {
    state: "COMPLETED",
    startedAt: nowIso(),
    completedAt: nowIso(),
    correlationId,
    message: "Demo provisioning completed instantly. No real infrastructure was touched.",
  };
  tenant.updatedAt = nowIso();
  appendAudit("TENANT_PROVISIONING_COMPLETED", id, "SUCCESS", {
    partnerId: tenant.partnerId,
    correlationId,
  });
  return tenant;
}

function handleSuspendTenant(id: string): Tenant {
  requireSession();
  const tenant = findTenant(id);
  tenant.lifecycle = "SUSPENDED";
  tenant.status = "SUSPENDED";
  tenant.updatedAt = nowIso();
  appendAudit("TENANT_SUSPENDED", id, "SUCCESS", { partnerId: tenant.partnerId });
  return tenant;
}

function handleListOperators(query: URLSearchParams): PaginatedResponse<Operator> {
  requireSession();
  let items = [...store.operators];
  const status = query.get("status") as OperatorStatus | null;
  const partnerId = query.get("partnerId");
  const search = query.get("search")?.toLowerCase();
  if (status) items = items.filter((o) => o.status === status);
  if (partnerId) items = items.filter((o) => o.partnerId === partnerId);
  if (search) {
    items = items.filter(
      (o) =>
        o.id.toLowerCase().includes(search) ||
        o.displayName.toLowerCase().includes(search) ||
        o.email.toLowerCase().includes(search),
    );
  }
  return paginate(items, Number(query.get("page") ?? 1), Number(query.get("pageSize") ?? 25));
}

function findOperator(id: string): Operator {
  const operator = store.operators.find((o) => o.id === id);
  if (!operator) fail(404, "DEMO_OPERATOR_NOT_FOUND", `Operator ${id} was not found.`);
  return operator as Operator;
}

function handleCreateOperator(body: CreateOperatorRequest | undefined): Operator {
  requireSession();
  if (!body?.partnerId || !body?.displayName || !body?.email) {
    fail(422, "DEMO_INVALID_REQUEST", "Partner, display name, and email are required.");
  }
  findPartner(body.partnerId);
  const id = nextOperatorId(body.partnerId, body.type);
  const operator: Operator = {
    id,
    partnerId: body.partnerId,
    displayName: body.displayName,
    type: body.type,
    status: "PENDING",
    email: body.email,
    credentialState: "PENDING_ENROLLMENT",
    createdAt: nowIso(),
  };
  store.operators.unshift(operator);
  const partner = findPartner(body.partnerId);
  partner.operatorCount += 1;
  appendAudit("OPERATOR_CREATED", id, "SUCCESS", { partnerId: body.partnerId });
  return operator;
}

function setOperatorCredentialState(operatorId: OperatorId, state: CredentialState): void {
  for (const credential of store.credentials) {
    if (credential.operatorId === operatorId) credential.state = state;
  }
}

function handleSuspendOperator(id: string, body: SuspendRequest | undefined): Operator {
  requireSession();
  const operator = findOperator(id);
  operator.status = "SUSPENDED";
  operator.credentialState = "SUSPENDED";
  setOperatorCredentialState(id, "SUSPENDED");
  appendAudit("OPERATOR_SUSPENDED", id, "SUCCESS", {
    partnerId: operator.partnerId,
    reason: body?.reason,
  });
  return operator;
}

function handleRevokeOperator(id: string, body: SuspendRequest | undefined): Operator {
  requireSession();
  const operator = findOperator(id);
  operator.status = "REVOKED";
  operator.credentialState = "REVOKED";
  setOperatorCredentialState(id, "REVOKED");
  appendAudit("OPERATOR_REVOKED", id, "SUCCESS", {
    partnerId: operator.partnerId,
    reason: body?.reason,
  });
  return operator;
}

function handleListCredentials(query: URLSearchParams): PaginatedResponse<Credential> {
  requireSession();
  let items = [...store.credentials];
  const state = query.get("state") as CredentialState | null;
  const operatorId = query.get("operatorId");
  if (state) items = items.filter((c) => c.state === state);
  if (operatorId) items = items.filter((c) => c.operatorId === operatorId);
  return paginate(items, Number(query.get("page") ?? 1), Number(query.get("pageSize") ?? 25));
}

function handleCreateEnrollment(
  operatorId: string,
  body: CreateEnrollmentRequest | undefined,
): EnrollmentResponse {
  requireSession();
  const operator = findOperator(operatorId);
  const id = `cred-demo-${store.seq++}`;
  const correlationId = demoCorrelationId();
  const expiresAt = new Date(
    Date.now() * 1 + (body?.expiresInHours ?? 168) * 60 * 60 * 1000,
  ).toISOString();
  const credential: Credential = {
    id,
    operatorId: operator.id,
    partnerId: operator.partnerId,
    state: "PENDING_ENROLLMENT",
    method: body?.method ?? "PASSWORD_MFA",
    expiresAt,
  };
  store.credentials.unshift(credential);
  operator.credentialState = "PENDING_ENROLLMENT";
  appendAudit("CREDENTIAL_ENROLLMENT_CREATED", id, "SUCCESS", {
    partnerId: operator.partnerId,
    correlationId,
  });
  return {
    credential,
    enrollmentReference: `ENR-DEMO-${id.slice(-4).toUpperCase()}`,
    expiresAt,
    correlationId,
  };
}

function handleRevokeCredential(id: string): Credential {
  requireSession();
  const credential = store.credentials.find((c) => c.id === id);
  if (!credential) fail(404, "DEMO_CREDENTIAL_NOT_FOUND", `Credential ${id} was not found.`);
  (credential as Credential).state = "REVOKED";
  (credential as Credential).revokedAt = nowIso();
  appendAudit("CREDENTIAL_REVOKED", id, "SUCCESS", {
    partnerId: (credential as Credential).partnerId,
  });
  return credential as Credential;
}

function handleSecurity(): SecuritySummary {
  requireSession();
  const ts = nowIso();
  return {
    authentication: {
      component: "demo-session-service",
      state: "HEALTHY",
      detail: "Demo mode: sessions are in-memory fixtures.",
      checkedAt: ts,
    },
    failedAuthAttempts24h: 0,
    activeAuthoritySessions: store.session ? 1 : 0,
    pendingEnrollments: store.credentials.filter((c) => c.state === "PENDING_ENROLLMENT").length,
    revokedCredentials: store.credentials.filter((c) => c.state === "REVOKED").length,
    suspendedOperators: store.operators.filter((o) => o.status === "SUSPENDED").length,
    keyStatus: {
      component: "demo-key-service",
      state: "HEALTHY",
      detail: "Demo mode: no real keys are managed.",
      checkedAt: ts,
    },
    policyStatus: {
      component: "demo-policy-engine",
      state: "HEALTHY",
      detail: "Demo mode: policy fixtures only.",
      checkedAt: ts,
    },
    recentSecurityEvents: [],
  };
}

function handleAudit(query: URLSearchParams): PaginatedResponse<AuditEvent> {
  requireSession();
  let items = [...store.audit];
  const action = query.get("action");
  const result = query.get("result");
  const search = query.get("search")?.toLowerCase();
  if (action) items = items.filter((e) => e.action === action);
  if (result) items = items.filter((e) => e.result === result);
  if (search) {
    items = items.filter(
      (e) =>
        e.resource.toLowerCase().includes(search) ||
        e.actor.toLowerCase().includes(search) ||
        e.action.toLowerCase().includes(search),
    );
  }
  return paginate(items, Number(query.get("page") ?? 1), Number(query.get("pageSize") ?? 25));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function demoApiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const qIndex = path.indexOf("?");
  const rawPath = qIndex === -1 ? path : path.slice(0, qIndex);
  const rawQuery = qIndex === -1 ? "" : path.slice(qIndex + 1);
  const query = new URLSearchParams(rawQuery);
  // Tests and future callers may pass query params via options instead of
  // the path (the real apiFetch appends them itself before delegating).
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) query.set(k, String(v));
    }
  }
  const segments = rawPath.split("/").filter(Boolean);
  const body = options.body as Record<string, unknown> | undefined;
  const seg = (index: number): string => decodeURIComponent(segments[index] ?? "");

  // Auth (no session required for login)
  if (method === "POST" && rawPath === "/auth/login") {
    return handleLogin(body as unknown as LoginRequest) as T;
  }
  if (method === "POST" && rawPath === "/auth/logout") {
    store.session = null;
    return undefined as T;
  }
  if (method === "GET" && rawPath === "/auth/session") {
    return requireSession() as T;
  }

  // Dashboard
  if (method === "GET" && rawPath === "/dashboard") {
    return handleDashboard() as T;
  }

  // Partners
  if (segments[0] === "partners") {
    if (segments.length === 1) {
      if (method === "GET") return handleListPartners(query) as T;
      if (method === "POST") return handleCreatePartner(body as unknown as CreatePartnerRequest) as T;
    }
    if (segments.length === 2) {
      const id = seg(1);
      if (method === "GET") {
        requireSession();
        return findPartner(id) as T;
      }
    }
    if (segments.length === 3 && segments[2] === "suspend" && method === "POST") {
      return handleSuspendPartner(seg(1), body as unknown as SuspendRequest) as T;
    }
    if (segments.length === 3 && segments[2] === "activate" && method === "POST") {
      return handleActivatePartner(seg(1)) as T;
    }
  }

  // Tenants
  if (segments[0] === "tenants") {
    if (segments.length === 1 && method === "GET") return handleListTenants(query) as T;
    if (segments.length === 2 && method === "GET") {
      requireSession();
      return findTenant(seg(1)) as T;
    }
    if (segments.length === 3 && segments[2] === "provision" && method === "POST") {
      return handleProvisionTenant(seg(1)) as T;
    }
    if (segments.length === 3 && segments[2] === "suspend" && method === "POST") {
      return handleSuspendTenant(seg(1)) as T;
    }
  }

  // Operators
  if (segments[0] === "operators") {
    if (segments.length === 1) {
      if (method === "GET") return handleListOperators(query) as T;
      if (method === "POST") return handleCreateOperator(body as unknown as CreateOperatorRequest) as T;
    }
    if (segments.length === 2 && method === "GET") {
      requireSession();
      return findOperator(seg(1)) as T;
    }
    if (segments.length === 3 && method === "POST") {
      const id = seg(1);
      if (segments[2] === "suspend") {
        return handleSuspendOperator(id, body as unknown as SuspendRequest) as T;
      }
      if (segments[2] === "revoke") {
        return handleRevokeOperator(id, body as unknown as SuspendRequest) as T;
      }
      if (segments[2] === "enrollment") {
        return handleCreateEnrollment(id, body as unknown as CreateEnrollmentRequest) as T;
      }
    }
  }

  // Credentials
  if (segments[0] === "credentials") {
    if (segments.length === 1 && method === "GET") return handleListCredentials(query) as T;
    if (segments.length === 3 && segments[2] === "revoke" && method === "POST") {
      return handleRevokeCredential(seg(1)) as T;
    }
  }

  // Security / audit / integrations
  if (method === "GET" && rawPath === "/security") return handleSecurity() as T;
  if (method === "GET" && rawPath === "/audit") return handleAudit(query) as T;
  if (method === "GET" && rawPath === "/integrations") {
    requireSession();
    return store.integrations as T;
  }

  fail(404, "DEMO_ROUTE_NOT_FOUND", `Demo backend has no route for ${method} ${rawPath}.`);
}
