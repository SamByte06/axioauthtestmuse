/**
 * ID format validators — backend-authoritative formats.
 * The frontend validates DISPLAYED values; it never generates IDs.
 */
import { describe, expect, it } from "vitest";
import {
  isValidPartnerId,
  isValidPartnerIdSuffix,
  isValidOperatorId,
} from "@axio-authority/validation";

describe("isValidPartnerIdSuffix", () => {
  it("accepts exactly 2 letters + exactly 4 digits in any order", () => {
    expect(isValidPartnerIdSuffix("7K42F8")).toBe(true); // documented example
    expect(isValidPartnerIdSuffix("AB1234")).toBe(true);
    expect(isValidPartnerIdSuffix("12AB34")).toBe(true);
    expect(isValidPartnerIdSuffix("1234AB")).toBe(true);
  });

  it("rejects wrong letter/digit counts", () => {
    expect(isValidPartnerIdSuffix("7K4R2F")).toBe(false); // 3 letters + 3 digits
    expect(isValidPartnerIdSuffix("ABCDEF")).toBe(false); // 6 letters
    expect(isValidPartnerIdSuffix("123456")).toBe(false); // 6 digits
    expect(isValidPartnerIdSuffix("A12345")).toBe(false); // 1 letter
  });

  it("rejects wrong length or characters", () => {
    expect(isValidPartnerIdSuffix("7K42F")).toBe(false);
    expect(isValidPartnerIdSuffix("7K42F88")).toBe(false);
    expect(isValidPartnerIdSuffix("7k42f8")).toBe(false); // lowercase
    expect(isValidPartnerIdSuffix("7K42F!")).toBe(false);
    expect(isValidPartnerIdSuffix("")).toBe(false);
  });
});

describe("isValidPartnerId", () => {
  it("accepts AXP-{STATE}-{SUFFIX}", () => {
    expect(isValidPartnerId("AXP-KL-7K42F8")).toBe(true); // Medanta (TEST) fixture
  });

  it("rejects malformed partner IDs", () => {
    expect(isValidPartnerId("AXP-KL-7K4R2F")).toBe(false);
    expect(isValidPartnerId("AXP-K-7K42F8")).toBe(false);
    expect(isValidPartnerId("AXP-KERALA-7K42F8")).toBe(false);
    expect(isValidPartnerId("AXB-KL-7K42F8")).toBe(false);
    expect(isValidPartnerId("axp-kl-7k42f8")).toBe(false);
    expect(isValidPartnerId("AXP-KL-7K42F8 ")).toBe(false);
  });
});

describe("isValidOperatorId", () => {
  it("accepts AXO-{SUFFIX}-{TYPE}{SEQUENCE}", () => {
    expect(isValidOperatorId("AXO-7K42F8-A00001")).toBe(true); // documented example
    expect(isValidOperatorId("AXO-AB1234-D00042")).toBe(true);
    expect(isValidOperatorId("AXO-12AB34-S99999")).toBe(true);
  });

  it("rejects unknown types and malformed sequences", () => {
    expect(isValidOperatorId("AXO-7K42F8-X00001")).toBe(false); // X not a type
    expect(isValidOperatorId("AXO-7K42F8-A0001")).toBe(false); // 4 digits
    expect(isValidOperatorId("AXO-7K42F8-A000001")).toBe(false); // 6 digits
    expect(isValidOperatorId("AXO-7K4R2F-A00001")).toBe(false); // bad suffix
    expect(isValidOperatorId("AXO-7K42F8-A00001 ")).toBe(false);
  });
});
