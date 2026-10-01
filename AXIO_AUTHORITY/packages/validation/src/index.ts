/**
 * @axio-authority/validation
 *
 * Zod schemas for Authority forms and API payloads.
 * ID-format validators encode the backend-authoritative formats so the UI
 * can validate DISPLAYED values; the frontend never generates IDs.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Identifier formats (backend-authoritative)
// ---------------------------------------------------------------------------

/**
 * Partner ID suffix: EXACTLY 2 uppercase letters + EXACTLY 4 digits,
 * 6 characters total, any order. "7K42F8" is valid; "7K4R2F" is not.
 */
export function isValidPartnerIdSuffix(suffix: string): boolean {
  if (!/^[A-Z0-9]{6}$/.test(suffix)) return false;
  const letters = (suffix.match(/[A-Z]/g) ?? []).length;
  const digits = (suffix.match(/[0-9]/g) ?? []).length;
  return letters === 2 && digits === 4;
}

/** Full partner ID: AXP-{STATE}-{SUFFIX}, e.g. "AXP-KL-7K42F8". */
export function isValidPartnerId(partnerId: string): boolean {
  const match = /^AXP-([A-Z]{2})-([A-Z0-9]{6})$/.exec(partnerId);
  return match !== null && isValidPartnerIdSuffix(match[2]!);
}

/**
 * Operator ID: AXO-{PARTNER_SUFFIX}-{TYPE}{SEQUENCE},
 * e.g. "AXO-7K42F8-A00001". Type ∈ {A,C,S,T,D}, sequence = 5 digits.
 */
export function isValidOperatorId(operatorId: string): boolean {
  const match = /^AXO-([A-Z0-9]{6})-([ACSTD])([0-9]{5})$/.exec(operatorId);
  return match !== null && isValidPartnerIdSuffix(match[1]!);
}

export const partnerIdSchema = z
  .string()
  .refine(isValidPartnerId, { message: "Must match AXP-{STATE}-{SUFFIX} (e.g. AXP-KL-7K42F8)" });

export const operatorIdSchema = z
  .string()
  .refine(isValidOperatorId, { message: "Must match AXO-{SUFFIX}-{TYPE}{SEQUENCE} (e.g. AXO-7K42F8-A00001)" });

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const partnerTypeSchema = z.enum([
  "HOSPITAL",
  "CLINIC",
  "LABORATORY",
  "INSURER",
  "PHARMACY",
  "GOVERNMENT",
]);

export const isolationModeSchema = z.enum(["SHARED", "DEDICATED_DATABASE"]);

export const operatorTypeSchema = z.enum(["A", "C", "S", "T", "D"]);

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const createPartnerFormSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required")
    .max(120, "Organization name is too long"),
  partnerType: partnerTypeSchema,
  state: z
    .string()
    .trim()
    .length(2, "Use the 2-letter state / UT code (e.g. KL)")
    .regex(/^[A-Z]{2}$/, "Use uppercase 2-letter state / UT code (e.g. KL)"),
  country: z.string().trim().min(2, "Country is required").max(80).default("India"),
  isolationMode: isolationModeSchema,
  adminFullName: z.string().trim().min(2, "Administrative contact name is required").max(120),
  adminEmail: z.string().trim().email("Enter a valid email address"),
  adminPhone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export type CreatePartnerForm = z.infer<typeof createPartnerFormSchema>;

export const createOperatorFormSchema = z.object({
  partnerId: partnerIdSchema,
  displayName: z.string().trim().min(2, "Display name is required").max(120),
  type: operatorTypeSchema,
  email: z.string().trim().email("Enter a valid email address"),
});

export type CreateOperatorForm = z.infer<typeof createOperatorFormSchema>;

export const destructiveActionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Provide a reason of at least 10 characters — it is written to the audit log")
    .max(500, "Reason is too long"),
  /** The operator must re-type the resource identifier to confirm. */
  confirmation: z.string().trim().min(1, "Type the resource identifier to confirm"),
});

export type DestructiveActionForm = z.infer<typeof destructiveActionSchema>;

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginForm = z.infer<typeof loginFormSchema>;

export const enrollmentFormSchema = z.object({
  operatorId: operatorIdSchema,
  method: z.enum(["PASSWORD_MFA", "AXIO_CARD", "HARDWARE_KEY"]),
  expiresInHours: z.coerce.number().int().min(1).max(168),
});

export type EnrollmentForm = z.infer<typeof enrollmentFormSchema>;
