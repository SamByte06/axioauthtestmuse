/** Zod form schemas — client-side validation mirrors backend rules. */
import { describe, expect, it } from "vitest";
import {
  createPartnerFormSchema,
  createOperatorFormSchema,
  destructiveActionSchema,
  loginFormSchema,
} from "@axio-authority/validation";

describe("createPartnerFormSchema", () => {
  const valid = {
    organizationName: "Medanta",
    partnerType: "HOSPITAL",
    state: "KL",
    country: "India",
    isolationMode: "DEDICATED_DATABASE",
    adminFullName: "Asha Nair",
    adminEmail: "asha@example.org",
    adminPhone: "+91 98470 12345",
  };

  it("accepts a valid partner form", () => {
    expect(createPartnerFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects bad state codes", () => {
    expect(
      createPartnerFormSchema.safeParse({ ...valid, state: "KERALA" }).success,
    ).toBe(false);
    expect(
      createPartnerFormSchema.safeParse({ ...valid, state: "kl" }).success,
    ).toBe(false);
  });

  it("rejects bad emails and short names", () => {
    expect(
      createPartnerFormSchema.safeParse({ ...valid, adminEmail: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      createPartnerFormSchema.safeParse({ ...valid, organizationName: "X" })
        .success,
    ).toBe(false);
  });

  it("allows empty optional phone", () => {
    expect(
      createPartnerFormSchema.safeParse({ ...valid, adminPhone: "" }).success,
    ).toBe(true);
  });
});

describe("createOperatorFormSchema", () => {
  it("accepts a valid operator form", () => {
    expect(
      createOperatorFormSchema.safeParse({
        partnerId: "AXP-KL-7K42F8",
        displayName: "Asha Nair",
        type: "A",
        email: "asha@example.org",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed partner IDs", () => {
    expect(
      createOperatorFormSchema.safeParse({
        partnerId: "PARTNER-1",
        displayName: "Asha Nair",
        type: "A",
        email: "asha@example.org",
      }).success,
    ).toBe(false);
  });
});

describe("destructiveActionSchema", () => {
  it("requires a real reason and a confirmation value", () => {
    expect(
      destructiveActionSchema.safeParse({
        reason: "Too short",
        confirmation: "AXP-KL-7K42F8",
      }).success,
    ).toBe(false);
    expect(
      destructiveActionSchema.safeParse({
        reason: "Partner requested offboarding in writing on 2026-09-30.",
        confirmation: "",
      }).success,
    ).toBe(false);
    expect(
      destructiveActionSchema.safeParse({
        reason: "Partner requested offboarding in writing on 2026-09-30.",
        confirmation: "AXP-KL-7K42F8",
      }).success,
    ).toBe(true);
  });
});

describe("loginFormSchema", () => {
  it("requires email and non-empty password", () => {
    expect(
      loginFormSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(
      loginFormSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      loginFormSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});
