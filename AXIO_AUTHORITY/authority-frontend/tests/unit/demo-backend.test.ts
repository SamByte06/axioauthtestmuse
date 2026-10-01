/**
 * Demo backend — the opt-in fixture backend behind NEXT_PUBLIC_AUTHORITY_DEMO_MODE.
 *
 * Verifies the auth flow (login/session/logout), the documented fixtures,
 * valid-format ID generation for created records, state transitions, and
 * audit writes. Nothing here touches a real backend.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { demoApiFetch, resetDemoBackend } from "@/lib/api/demo-backend";
import { isValidOperatorId, isValidPartnerId } from "@axio-authority/validation";
import type {
  AuditEvent,
  AuthoritySession,
  CreatePartnerResponse,
  PaginatedResponse,
  Partner,
} from "@axio-authority/shared-types";
import type {
  DashboardSummary,
  LoginResponse,
} from "@axio-authority/api-contracts";

const LOGIN = { email: "demo@example.test", password: "demo-password" };

async function login(): Promise<LoginResponse> {
  return demoApiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: LOGIN,
  });
}

beforeEach(() => {
  resetDemoBackend();
});

describe("demo auth flow", () => {
  it("starts unauthenticated: /auth/session throws 401", async () => {
    await expect(demoApiFetch("/auth/session")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("login issues a demo admin session; logout invalidates it", async () => {
    const { session } = await login();
    expect(session.displayName).toBe("Demo Administrator");
    expect(session.roles).toContain("SUPER_AUTHORITY_ADMIN");

    const me = await demoApiFetch<AuthoritySession>("/auth/session");
    expect(me.administratorId).toBe(session.administratorId);

    await demoApiFetch("/auth/logout", { method: "POST" });
    await expect(demoApiFetch("/auth/session")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("login requires email and password (422)", async () => {
    await expect(
      demoApiFetch("/auth/login", {
        method: "POST",
        body: { email: "", password: "" },
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("demo fixtures", () => {
  it("lists the documented Medanta (TEST) fixture", async () => {
    await login();
    const page = await demoApiFetch<PaginatedResponse<Partner>>("/partners", {
      query: { page: 1, pageSize: 25 },
    });
    expect(page.total).toBeGreaterThanOrEqual(3);

    const medanta = page.data.find((p) => p.id === "AXP-KL-7K42F8");
    expect(medanta).toBeDefined();
    expect(medanta?.organizationName).toBe("Medanta (TEST)");
    expect(medanta?.testFixture).toBe(true);
    expect(isValidPartnerId(medanta?.id ?? "")).toBe(true);
  });

  it("dashboard aggregates fixture counts and identifies itself", async () => {
    await login();
    const dash = await demoApiFetch<DashboardSummary>("/dashboard");
    expect(dash.activePartners).toBeGreaterThan(0);
    expect(dash.infrastructure[0]?.component).toBe("demo-backend");
  });

  it("unknown partner id throws 404", async () => {
    await login();
    await expect(demoApiFetch("/partners/AXP-XX-NOPE12")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("demo mutations", () => {
  it("createPartner generates valid-format IDs and fixture records", async () => {
    await login();
    const res = await demoApiFetch<CreatePartnerResponse>("/partners", {
      method: "POST",
      body: {
        organizationName: "Test Hospital (TEST)",
        partnerType: "HOSPITAL",
        state: "Kerala",
        country: "India",
        isolationMode: "SHARED",
        administrativeContact: {
          fullName: "Demo User",
          email: "demo.user@example.test",
        },
        idempotencyKey: "idem-demo-1",
      },
    });

    expect(isValidPartnerId(res.partner.id)).toBe(true);
    expect(res.partner.id.startsWith("AXP-")).toBe(true);
    expect(res.partner.testFixture).toBe(true);
    expect(isValidOperatorId(res.initialOperator.id)).toBe(true);
    expect(res.correlationId.startsWith("AX-REQ-DEMO-")).toBe(true);

    const page = await demoApiFetch<PaginatedResponse<Partner>>("/partners", {
      query: { search: "Test Hospital" },
    });
    expect(page.total).toBe(1);
  });

  it("suspend/activate transition status and write audit events", async () => {
    await login();
    const suspended = await demoApiFetch<Partner>(
      "/partners/AXP-KL-7K42F8/suspend",
      {
        method: "POST",
        body: { reason: "demo test suspension", idempotencyKey: "idem-demo-2" },
      },
    );
    expect(suspended.status).toBe("SUSPENDED");

    const audit = await demoApiFetch<PaginatedResponse<AuditEvent>>("/audit", {
      query: { action: "PARTNER_SUSPENDED" },
    });
    expect(audit.data[0]?.resource).toBe("AXP-KL-7K42F8");
    expect(audit.data[0]?.reason).toBe("demo test suspension");

    const activated = await demoApiFetch<Partner>(
      "/partners/AXP-KL-7K42F8/activate",
      { method: "POST" },
    );
    expect(activated.status).toBe("ACTIVE");
  });

  it("suspending an already-suspended partner throws 409", async () => {
    await login();
    await expect(
      demoApiFetch("/partners/AXP-MH-QM2041/suspend", {
        method: "POST",
        body: { reason: "again", idempotencyKey: "idem-demo-3" },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
