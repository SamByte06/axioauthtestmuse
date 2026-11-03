import { describe, expect, it } from "vitest";
import {
  mapBackendHospitalResponseToCreatePartnerResponse,
  mapCreatePartnerFormToBackend,
  mapSecurityEventDtoToAuditEvent,
  mapTenantDtoToConsoleTenant,
  mapUserAdminDtoToOperator,
} from "@/lib/api/backend/mappers";
import {
  createHospitalResponseRawSchema,
  sanitizeHospitalResponse,
  type CreateHospitalResponseRawDto,
  type SecurityEventDto,
  type TenantDto,
  type UserAdminDto,
} from "@/lib/api/backend/dto";
import { isStandardId } from "@/components/ui/AxioIdDisplay";

describe("Backend Adapter — DTO Mappers & Secret Stripping", () => {
  const RAW_BACKEND_HOSPITAL_RESPONSE: CreateHospitalResponseRawDto = {
    organization: "Apollo Specialty (TEST)",
    partner_id: "AXP-MH-QM2041",
    operator_id: "AXO-QM2041-A00001",
    tenant_status: "ACTIVE",
    isolation_mode: "DEDICATED_DATABASE",
    tenant_id: "11111111-2222-3333-4444-555555555555",
    operator_type: "A",
    administrator_user_id: "99999999-8888-7777-6666-555555555555",
    administrator_email: "admin.apollo@example.org",
    enrollment_token: "SECRET_TOKEN_DO_NOT_EXPOSE_12345",
    enrollment_url: "https://auth.axiovital.internal/enroll?ref=REF12345",
    mfa_secret: "SECRET_MFA_JBSWY3DPEHPK3PXP",
    mfa_qr_code_uri: "otpauth://totp/AxioVital:admin?secret=SECRET_MFA_JBSWY3DPEHPK3PXP",
    created_at_utc: "2026-11-04T00:00:00.000Z",
  };

  it("sanitizes create-hospital response by strictly stripping mfa_secret, mfa_qr_code_uri, and enrollment_token", () => {
    const rawParsed = createHospitalResponseRawSchema.parse(RAW_BACKEND_HOSPITAL_RESPONSE);
    expect(rawParsed.mfa_secret).toBeDefined();

    const sanitized = sanitizeHospitalResponse(RAW_BACKEND_HOSPITAL_RESPONSE);

    // Verify secrets are strictly stripped
    expect((sanitized as any).mfa_secret).toBeUndefined();
    expect((sanitized as any).mfa_qr_code_uri).toBeUndefined();
    expect((sanitized as any).enrollment_token).toBeUndefined();

    // Verify non-secret operational fields remain intact
    expect(sanitized.organization).toBe("Apollo Specialty (TEST)");
    expect(sanitized.partner_id).toBe("AXP-MH-QM2041");
    expect(sanitized.tenant_id).toBe("11111111-2222-3333-4444-555555555555");
    expect(sanitized.operator_id).toBe("AXO-QM2041-A00001");
    expect(sanitized.enrollment_url).toBe("https://auth.axiovital.internal/enroll?ref=REF12345");
  });

  it("maps CreatePartnerForm to backend CreateHospitalRequest", () => {
    const backendReq = mapCreatePartnerFormToBackend({
      organizationName: "Medanta Medicity",
      partnerType: "HOSPITAL",
      state: "kl",
      country: "India",
      isolationMode: "DEDICATED_DATABASE",
      adminFullName: "Dr. Ramesh Nair",
      adminEmail: "ramesh@example.org",
      adminPhone: "+91 98470 11111",
    });

    expect(backendReq.hospitalName).toBe("Medanta Medicity");
    expect(backendReq.state).toBe("KL"); // normalized uppercase
    expect(backendReq.isolationMode).toBe("DEDICATED_DATABASE");
    expect(backendReq.administratorEmail).toBe("ramesh@example.org");
    expect(backendReq.administratorFirstName).toBe("Dr.");
    expect(backendReq.administratorLastName).toBe("Ramesh Nair");
  });

  it("maps sanitized backend response to console CreatePartnerResponse", () => {
    const sanitized = sanitizeHospitalResponse(RAW_BACKEND_HOSPITAL_RESPONSE);
    const consoleResponse = mapBackendHospitalResponseToCreatePartnerResponse(
      sanitized,
      "AX-CORR-12345",
    );

    expect(consoleResponse.partner.id).toBe("AXP-MH-QM2041");
    expect(consoleResponse.partner.organizationName).toBe("Apollo Specialty (TEST)");
    expect(consoleResponse.partner.isolationMode).toBe("DEDICATED_DATABASE");
    expect(consoleResponse.tenant.id).toBe("11111111-2222-3333-4444-555555555555");
    expect(consoleResponse.initialOperator.id).toBe("AXO-QM2041-A00001");
    expect(consoleResponse.enrollmentUrl).toBe("https://auth.axiovital.internal/enroll?ref=REF12345");
    expect(consoleResponse.correlationId).toBe("AX-CORR-12345");

    // Zero secret leakage in console response
    expect((consoleResponse as any).mfa_secret).toBeUndefined();
    expect((consoleResponse as any).enrollment_token).toBeUndefined();
  });

  it("maps TenantDto to console Tenant model", () => {
    const dto: TenantDto = {
      id: "22222222-3333-4444-5555-666666666666",
      name: "Medanta Tenant",
      organizationName: "Medanta",
      partnerId: "AXP-KL-7K42F8",
      isolationMode: "DEDICATED_DATABASE",
      status: "ACTIVE",
      isActive: true,
      region: "in-south-1",
      createdAtUtc: "2026-11-04T00:00:00.000Z",
    };

    const tenant = mapTenantDtoToConsoleTenant(dto);
    expect(tenant.id).toBe("22222222-3333-4444-5555-666666666666");
    expect(tenant.partnerId).toBe("AXP-KL-7K42F8");
    expect(tenant.provisioningStatus.state).toBe("COMPLETED");
  });

  it("maps SecurityEventDto to console AuditEvent model", () => {
    const dto: SecurityEventDto = {
      id: "sec-1",
      tenantId: "AXP-KL-7K42F8",
      eventType: "UNAUTHORIZED_ACCESS_ATTEMPT",
      actorEmail: "malicious@example.org",
      targetResource: "HOSPITAL_RECORD",
      timestampUtc: "2026-11-04T01:00:00.000Z",
    };

    const audit = mapSecurityEventDtoToAuditEvent(dto);
    expect(audit.action).toBe("SECURITY_EVENT_CREATED");
    expect(audit.actor).toBe("malicious@example.org");
    expect(audit.reason).toBe("UNAUTHORIZED_ACCESS_ATTEMPT");
    expect(audit.source).toBe("SECURITY_SERVICE");
  });

  it("maps UserAdminDto to console Operator model", () => {
    const dto: UserAdminDto = {
      id: "user-1",
      email: "asha@example.org",
      firstName: "Asha",
      lastName: "Nair",
      operatorId: "AXO-KL0001-A00001",
      operatorType: "A",
      isActive: true,
      mfaEnabled: true,
    };

    const op = mapUserAdminDtoToOperator(dto, "AXP-KL-7K42F8");
    expect(op.id).toBe("AXO-KL0001-A00001");
    expect(op.displayName).toBe("Asha Nair");
    expect(op.status).toBe("ACTIVE");
    expect(op.credentialState).toBe("ACTIVE");
  });
});

describe("ID Format Validation (D4)", () => {
  it("identifies canonical AxioVital partner IDs", () => {
    expect(isStandardId("AXP-KL-7K42F8", "partner")).toBe(true);
    expect(isStandardId("AXP-MH-QM2041", "partner")).toBe(true);
    expect(isStandardId("HOSP-INVALID-1", "partner")).toBe(false);
  });

  it("identifies canonical AxioVital operator IDs", () => {
    expect(isStandardId("AXO-7K42F8-A00001", "operator")).toBe(true);
    expect(isStandardId("AXO-QM2041-C00002", "operator")).toBe(true);
    expect(isStandardId("user-custom-id", "operator")).toBe(false);
  });

  it("identifies standard UUID tenant IDs", () => {
    expect(isStandardId("11111111-2222-3333-4444-555555555555", "tenant")).toBe(true);
    expect(isStandardId("TNT-KL-0001", "tenant")).toBe(true);
    expect(isStandardId("invalid_tenant_name", "tenant")).toBe(false);
  });
});
