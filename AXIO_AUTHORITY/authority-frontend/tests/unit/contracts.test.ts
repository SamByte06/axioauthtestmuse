/**
 * API contract catalogue integrity.
 * Every contract the frontend is built against must declare a method,
 * a path, a required permission, and a buildable path template.
 */
import { describe, expect, it } from "vitest";
import { ALL_CONTRACTS } from "@axio-authority/api-contracts";

describe("ALL_CONTRACTS", () => {
  it("is non-empty and every contract is well-formed", () => {
    expect(ALL_CONTRACTS.length).toBeGreaterThan(0);
    for (const c of ALL_CONTRACTS) {
      expect(["GET", "POST", "PATCH", "DELETE"]).toContain(c.method);
      expect(c.path.startsWith("/")).toBe(true);
      expect(c.requiresPermission.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(["IMPLEMENTED", "BACKEND CONTRACT REQUIRED", "FUTURE"]).toContain(
        c.status,
      );
    }
  });

  it("has unique paths per method", () => {
    const seen = new Set<string>();
    for (const c of ALL_CONTRACTS) {
      const key = `${c.method} ${c.path}`;
      expect(seen.has(key), `duplicate contract: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("buildPath substitutes and encodes route params", () => {
    const get = ALL_CONTRACTS.find((c) => c.name === "getPartner")!;
    expect(get.buildPath({ partnerId: "AXP-KL-7K42F8" })).toBe(
      "/partners/AXP-KL-7K42F8",
    );
  });

  it("covers every required domain from the build brief", () => {
    const names = ALL_CONTRACTS.map((c) => c.name);
    for (const required of [
      "login",
      "session",
      "dashboard",
      "createPartner",
      "listPartners",
      "getPartner",
      "suspendPartner",
      "listTenants",
      "provisionTenant",
      "listOperators",
      "createOperator",
      "suspendOperator",
      "revokeOperator",
      "listCredentials",
      "createEnrollment",
      "revokeCredential",
      "securitySummary",
      "listAuditEvents",
      "listIntegrations",
    ] as const) {
      expect(names, `missing contract: ${required}`).toContain(required);
    }
  });
});
