/**
 * RBAC helpers — frontend visibility mirrors backend permissions.
 * These tests pin least-privilege defaults: read roles must not gain
 * destructive permissions through the mirror.
 */
import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  type AuthoritySession,
} from "@axio-authority/shared-types";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";

function sessionWith(
  permissions: AuthoritySession["permissions"],
): AuthoritySession {
  return {
    administratorId: "adm-1",
    displayName: "Test Admin",
    email: "admin@example.org",
    roles: ["READ_ONLY_AUTHORITY"],
    permissions,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

describe("hasPermission", () => {
  it("returns false without a session", () => {
    expect(hasPermission(null, "authority.partner.read")).toBe(false);
  });

  it("grants only listed permissions", () => {
    const s = sessionWith(["authority.partner.read"]);
    expect(hasPermission(s, "authority.partner.read")).toBe(true);
    expect(hasPermission(s, "authority.partner.create")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("is true when any permission matches", () => {
    const s = sessionWith(["authority.audit.read"]);
    expect(
      hasAnyPermission(s, ["authority.partner.read", "authority.audit.read"]),
    ).toBe(true);
    expect(hasAnyPermission(s, ["authority.partner.create"])).toBe(false);
  });
});

describe("ROLE_PERMISSIONS least privilege", () => {
  it("AUDITOR and READ_ONLY_AUTHORITY have no destructive permissions", () => {
    const destructive = [
      "authority.partner.create",
      "authority.partner.suspend",
      "authority.tenant.provision",
      "authority.operator.revoke",
      "authority.credentials.revoke",
      "authority.integration.manage",
    ];
    for (const role of ["AUDITOR", "READ_ONLY_AUTHORITY"] as const) {
      for (const p of destructive) {
        expect(
          ROLE_PERMISSIONS[role],
          `${role} must not include ${p}`,
        ).not.toContain(p);
      }
    }
  });

  it("SECURITY_ADMIN cannot create partners or manage integrations", () => {
    expect(ROLE_PERMISSIONS.SECURITY_ADMIN).not.toContain("authority.partner.create");
    expect(ROLE_PERMISSIONS.SECURITY_ADMIN).not.toContain("authority.integration.manage");
  });

  it("only SUPER_AUTHORITY_ADMIN holds the full permission set", () => {
    const all = new Set<string>();
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) all.add(p);
    }
    expect(ROLE_PERMISSIONS.SUPER_AUTHORITY_ADMIN).toHaveLength(all.size);
  });
});
