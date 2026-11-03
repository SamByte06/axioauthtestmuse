/**
 * dto.ts — Zod schemas and TypeScript types for the live ASP.NET Core admin backend.
 *
 * All request and response structures match the OpenAPI schemas discovered at
 * the live backend OpenAPI documentation.
 *
 * CRITICAL SECURITY REQUIREMENT (D3):
 * Secrets returned by the backend (`mfa_secret`, `mfa_qr_code_uri`, and `enrollment_token`)
 * MUST be stripped at this Zod/proxy boundary before reaching browser JavaScript.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Hospital & Organization Creation
// ---------------------------------------------------------------------------

export const createHospitalRequestDtoSchema = z.object({
  hospitalName: z.string().min(1),
  state: z.string().min(1),
  isolationMode: z.string().min(1),
  administratorEmail: z.string().email().optional(),
  administratorFirstName: z.string().optional(),
  administratorLastName: z.string().optional(),
  identifier: z.string().optional(),
});
export type CreateHospitalRequestDto = z.infer<typeof createHospitalRequestDtoSchema>;

/**
 * Raw response from POST /api/v1/admin/hospitals or /api/v1/admin/organizations/b2b.
 * Contains snake_case fields as emitted by ASP.NET Core.
 */
export const createHospitalResponseRawSchema = z.object({
  organization: z.string().nullable().optional(),
  partner_id: z.string().nullable().optional(),
  operator_id: z.string().nullable().optional(),
  tenant_status: z.string().nullable().optional(),
  isolation_mode: z.string().nullable().optional(),
  tenant_id: z.string().uuid().optional(),
  operator_type: z.string().nullable().optional(),
  administrator_user_id: z.string().uuid().optional(),
  administrator_email: z.string().nullable().optional(),
  // Sensitive fields:
  enrollment_token: z.string().nullable().optional(),
  enrollment_url: z.string().nullable().optional(),
  mfa_secret: z.string().nullable().optional(),
  mfa_qr_code_uri: z.string().nullable().optional(),
  created_at_utc: z.string().optional(),
});
export type CreateHospitalResponseRawDto = z.infer<typeof createHospitalResponseRawSchema>;

/**
 * Sanitized response stripped of dangerous secrets:
 * - mfa_secret: STRIPPED (platform admin must not clone second factor)
 * - mfa_qr_code_uri: STRIPPED (platform admin must not clone second factor)
 * - enrollment_token: STRIPPED (raw credential token never stored in UI state)
 *
 * enrollment_url is retained but treated as sensitive (masked in UI).
 */
export const createHospitalResponseSanitizedSchema = createHospitalResponseRawSchema
  .transform((raw) => {
    // Explicitly delete/omit secrets before handing off to browser JavaScript
    const {
      mfa_secret: _mfaSecret,
      mfa_qr_code_uri: _mfaQr,
      enrollment_token: _token,
      ...safe
    } = raw;
    return safe;
  });
export type CreateHospitalResponseSanitizedDto = z.infer<typeof createHospitalResponseSanitizedSchema>;

/**
 * Helper to strip secrets from raw create-hospital response.
 */
export function sanitizeHospitalResponse(data: unknown): CreateHospitalResponseSanitizedDto {
  const parsed = createHospitalResponseRawSchema.parse(data);
  return createHospitalResponseSanitizedSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// 2. Tenants
// ---------------------------------------------------------------------------

export const createTenantRequestDtoSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().min(1),
  identifier: z.string().optional(),
  organizationId: z.string().optional(),
  partnerId: z.string().optional(),
  stateCode: z.string().min(1),
  isolationMode: z.string().min(1),
  region: z.string().optional(),
  dataResidency: z.string().optional(),
});
export type CreateTenantRequestDto = z.infer<typeof createTenantRequestDtoSchema>;

export const tenantDtoSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
  identifier: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  partnerId: z.string().nullable().optional(),
  stateCode: z.string().nullable().optional(),
  isolationMode: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  dataResidency: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAtUtc: z.string().optional(),
});
export type TenantDto = z.infer<typeof tenantDtoSchema>;

export const tenantProvisioningRequestDtoSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().min(1),
  identifier: z.string().optional(),
  organizationId: z.string().optional(),
  stateCode: z.string().min(1),
  isolationMode: z.string().min(1),
  region: z.string().optional(),
  dataResidency: z.string().optional(),
});
export type TenantProvisioningRequestDto = z.infer<typeof tenantProvisioningRequestDtoSchema>;

export const tenantProvisioningResponseDtoSchema = z.object({
  success: z.boolean(),
  tenantId: z.string().uuid(),
  partnerId: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  identifier: z.string().nullable().optional(),
  isolationMode: z.string().nullable().optional(),
  databaseName: z.string().nullable().optional(),
  databaseReference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  createdAtUtc: z.string().optional(),
});
export type TenantProvisioningResponseDto = z.infer<typeof tenantProvisioningResponseDtoSchema>;

// ---------------------------------------------------------------------------
// 3. Users & Operators
// ---------------------------------------------------------------------------

export const createB2bAdminRequestDtoSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().optional(),
  requireMfa: z.boolean().optional().default(true),
});
export type CreateB2bAdminRequestDto = z.infer<typeof createB2bAdminRequestDtoSchema>;

export const userAdminDtoSchema = z.object({
  id: z.string(),
  axioId: z.string().nullable().optional(),
  operatorId: z.string().nullable().optional(),
  operatorType: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  lastLoginAtUtc: z.string().nullable().optional(),
  createdAtUtc: z.string().optional(),
  roles: z.array(z.string()).nullable().optional(),
});
export type UserAdminDto = z.infer<typeof userAdminDtoSchema>;

export const inviteUserRequestDtoSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  initialRoleName: z.string().optional(),
});
export type InviteUserRequestDto = z.infer<typeof inviteUserRequestDtoSchema>;

export const enrollmentInvitationDtoSchema = z.object({
  invitationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  initialRoleName: z.string().nullable().optional(),
  invitationToken: z.string().nullable().optional(),
  expiresAtUtc: z.string(),
});
export type EnrollmentInvitationDto = z.infer<typeof enrollmentInvitationDtoSchema>;

export const assignRoleRequestDtoSchema = z.object({
  roleId: z.string(),
});
export type AssignRoleRequestDto = z.infer<typeof assignRoleRequestDtoSchema>;

// ---------------------------------------------------------------------------
// 4. Security Events
// ---------------------------------------------------------------------------

export const securityEventDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable().optional(),
  eventType: z.string(),
  actorId: z.string().nullable().optional(),
  actorEmail: z.string().nullable().optional(),
  targetResource: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  timestampUtc: z.string(),
  detailsJson: z.string().nullable().optional(),
});
export type SecurityEventDto = z.infer<typeof securityEventDtoSchema>;

// ---------------------------------------------------------------------------
// 5. Credentials & Reset
// ---------------------------------------------------------------------------

export const resetCredentialRequestDtoSchema = z.object({
  newPassword: z.string().optional(),
});
export type ResetCredentialRequestDto = z.infer<typeof resetCredentialRequestDtoSchema>;

// ---------------------------------------------------------------------------
// 6. Authentication (ASP.NET Core Auth)
// ---------------------------------------------------------------------------

export const loginRequestDtoSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
  tenantIdentifier: z.string().optional(),
  identifier: z.string().optional(),
  mfaCode: z.string().optional(),
  challengeId: z.string().uuid().optional(),
});
export type LoginRequestDto = z.infer<typeof loginRequestDtoSchema>;

export const authResponseDtoSchema = z.object({
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  expiresAtUtc: z.string(),
  userId: z.string().nullable().optional(),
  axioId: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  tenantId: z.string().nullable().optional(),
  roles: z.array(z.string()).nullable().optional(),
  permissions: z.array(z.string()).nullable().optional(),
  sessionId: z.string().nullable().optional(),
  authStrength: z.string().nullable().optional(),
  requiresMfa: z.boolean().optional(),
  mfaChallengeToken: z.string().nullable().optional(),
});
export type AuthResponseDto = z.infer<typeof authResponseDtoSchema>;
