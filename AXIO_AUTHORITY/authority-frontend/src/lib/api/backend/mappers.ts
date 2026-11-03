/**
 * mappers.ts — Transforms between ASP.NET Core backend DTOs and console internal types.
 *
 * Keeps page components decoupled from backend naming conventions (snake_case vs camelCase)
 * and ensures forbidden secrets (mfa_secret, mfa_qr_code_uri, enrollment_token) never enter
 * application state.
 */
import type {
  AuditEvent,
  CreatePartnerResponse,
  IsolationMode,
  Operator,
  OperatorType,
  Partner,
  Tenant,
} from "@axio-authority/shared-types";
import type { CreatePartnerForm } from "@axio-authority/validation";
import type {
  CreateHospitalRequestDto,
  CreateHospitalResponseSanitizedDto,
  SecurityEventDto,
  TenantDto,
  UserAdminDto,
} from "./dto";

/**
 * Maps the console's CreatePartnerForm to the backend's CreateHospitalRequest.
 */
export function mapCreatePartnerFormToBackend(
  form: CreatePartnerForm,
): CreateHospitalRequestDto {
  const parts = form.adminFullName ? form.adminFullName.trim().split(/\s+/) : [];
  const administratorFirstName = parts[0] || undefined;
  const administratorLastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

  return {
    hospitalName: form.organizationName.trim(),
    state: form.state.trim().toUpperCase(),
    isolationMode: form.isolationMode,
    administratorEmail: form.adminEmail?.trim() || undefined,
    administratorFirstName,
    administratorLastName,
  };
}

/**
 * Maps the sanitized backend response to the console's CreatePartnerResponse.
 *
 * Note: mfa_secret, mfa_qr_code_uri, and enrollment_token are completely absent
 * from CreateHospitalResponseSanitizedDto. Only enrollment_url is preserved
 * for the secure masked reveal view.
 */
export function mapBackendHospitalResponseToCreatePartnerResponse(
  dto: CreateHospitalResponseSanitizedDto,
  correlationId: string,
): CreatePartnerResponse {
  const partnerId = dto.partner_id ?? "AXP-UNKNOWN";
  const now = dto.created_at_utc ?? new Date().toISOString();

  const partner: Partner = {
    id: partnerId,
    organizationName: dto.organization ?? "Registered Hospital",
    partnerType: "HOSPITAL",
    state: "",
    country: "India",
    isolationMode: (dto.isolation_mode as IsolationMode) ?? "SHARED_DATABASE",
    status: (dto.tenant_status as Partner["status"]) ?? "ACTIVE",
    operatorCount: dto.operator_id ? 1 : 0,
    tenantId: dto.tenant_id ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const initialOperator: Operator = {
    id: dto.operator_id ?? "AXO-UNKNOWN-A00001",
    partnerId,
    displayName: dto.administrator_email ?? "Hospital Administrator",
    email: dto.administrator_email ?? "",
    type: (dto.operator_type as OperatorType) ?? "A",
    status: "PENDING",
    credentialState: "PENDING_ENROLLMENT",
    createdAt: now,
  };

  const tenant: Tenant = {
    id: dto.tenant_id ?? "unknown-tenant",
    partnerId,
    organizationName: dto.organization ?? "Registered Hospital",
    region: "in-south-1",
    isolationMode: (dto.isolation_mode as IsolationMode) ?? "SHARED_DATABASE",
    lifecycle: dto.tenant_status === "ACTIVE" ? "ACTIVE" : "PROVISIONING",
    provisioningStatus: {
      state: dto.tenant_status === "ACTIVE" ? "COMPLETED" : "IN_PROGRESS",
      startedAt: now,
      completedAt: dto.tenant_status === "ACTIVE" ? now : undefined,
    },
    operatorCount: dto.operator_id ? 1 : 0,
    status: (dto.tenant_status as "ACTIVE" | "SUSPENDED") ?? "ACTIVE",
    createdAt: now,
    updatedAt: now,
  }

  return {
    partner,
    initialOperator,
    tenant,
    enrollmentUrl: dto.enrollment_url ?? undefined,
    correlationId,
  };
}

/**
 * Maps a TenantDto from GET /api/v1/admin/tenants/{id} to the console's Tenant model.
 */
export function mapTenantDtoToConsoleTenant(dto: TenantDto): Tenant {
  const now = dto.createdAtUtc ?? new Date().toISOString();
  return {
    id: dto.id,
    partnerId: dto.partnerId ?? "AXP-UNKNOWN",
    organizationName: dto.organizationName ?? dto.name ?? "Hospital Tenant",
    region: dto.region ?? "in-south-1",
    isolationMode: (dto.isolationMode as IsolationMode) ?? "SHARED_DATABASE",
    lifecycle: dto.status === "ACTIVE" || dto.isActive ? "ACTIVE" : "SUSPENDED",
    provisioningStatus: {
      state: dto.status === "ACTIVE" || dto.isActive ? "COMPLETED" : "IN_PROGRESS",
      startedAt: now,
      completedAt: dto.status === "ACTIVE" || dto.isActive ? now : undefined,
    },
    operatorCount: 0,
    status: dto.status === "ACTIVE" || dto.isActive ? "ACTIVE" : "SUSPENDED",
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Maps a SecurityEventDto from GET /api/v1/admin/security-events to the console's AuditEvent model.
 */
export function mapSecurityEventDtoToAuditEvent(dto: SecurityEventDto): AuditEvent {
  return {
    id: dto.id,
    action: "SECURITY_EVENT_CREATED",
    resource: dto.targetResource ?? dto.tenantId ?? "UNKNOWN_RESOURCE",
    actor: dto.actorEmail ?? dto.actorId ?? "system",
    result: "SUCCESS",
    timestamp: dto.timestampUtc,
    source: "SECURITY_SERVICE",
    reason: dto.eventType,
    partnerId: dto.tenantId ?? undefined,
  };
}

/**
 * Maps a UserAdminDto from /api/v1/admin/users/create-admin to console Operator model.
 */
export function mapUserAdminDtoToOperator(
  dto: UserAdminDto,
  partnerId: string = "AXP-UNKNOWN",
): Operator {
  const now = dto.createdAtUtc ?? new Date().toISOString();
  const displayName =
    dto.firstName || dto.lastName
      ? `${dto.firstName ?? ""} ${dto.lastName ?? ""}`.trim()
      : dto.email;

  return {
    id: dto.operatorId ?? dto.id,
    partnerId,
    displayName,
    email: dto.email,
    type: (dto.operatorType as OperatorType) ?? "A",
    status: dto.isActive ? "ACTIVE" : "SUSPENDED",
    credentialState: dto.mfaEnabled ? "ACTIVE" : "PENDING_ENROLLMENT",
    createdAt: now,
  };
}
