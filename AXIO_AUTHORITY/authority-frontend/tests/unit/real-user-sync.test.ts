import { beforeEach, describe, expect, it } from "vitest";
import { demoApiFetch, resetDemoBackend } from "@/lib/api/demo-backend";
import type {
  AuthoritySession,
  Operator,
  PaginatedResponse,
  Partner,
} from "@axio-authority/shared-types";
import type { LoginResponse } from "@axio-authority/api-contracts";

beforeEach(() => {
  resetDemoBackend();
});

describe("real user sync and display", () => {
  it("surfaces Dr. Sharma from the main software as an active operator", async () => {
    // Sign in as Dr. Sharma
    const loginRes = await demoApiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email: "dr.sharma@axiovital.com", password: "secure-password" },
    });

    expect(loginRes.session.displayName).toBe("Dr. Sharma");
    expect(loginRes.session.email).toBe("dr.sharma@axiovital.com");

    // Fetch operators list
    const operators = await demoApiFetch<PaginatedResponse<Operator>>("/operators");
    const drSharma = operators.data.find((o) => o.email === "dr.sharma@axiovital.com");

    expect(drSharma).toBeDefined();
    expect(drSharma?.displayName).toBe("Dr. Sharma");
    expect(drSharma?.isRealUser).toBe(true);
    expect(drSharma?.clientApp).toContain("AxioVital Desktop");
    expect(drSharma?.organizationName).toBe("AxioVital General Hospital");
    expect(drSharma?.partnerId).toBe("AXP-DL-GH0001");
  });

  it("lists AxioVital General Hospital as an active live partner (non-fixture)", async () => {
    await demoApiFetch("/auth/login", {
      method: "POST",
      body: { email: "admin@axiovital.local", password: "password123" },
    });

    const partners = await demoApiFetch<PaginatedResponse<Partner>>("/partners");
    const hospital = partners.data.find((p) => p.id === "AXP-DL-GH0001");

    expect(hospital).toBeDefined();
    expect(hospital?.organizationName).toBe("AxioVital General Hospital");
    expect(hospital?.testFixture).toBe(false);
    expect(hospital?.status).toBe("ACTIVE");
  });

  it("personalizes session for any administrator logging in", async () => {
    const res = await demoApiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email: "sudhanshu.patel@hospital.org", password: "password123" },
    });

    expect(res.session.displayName).toBe("Sudhanshu Patel");
    expect(res.session.email).toBe("sudhanshu.patel@hospital.org");
    expect(res.session.roles).toContain("SUPER_AUTHORITY_ADMIN");

    const session = await demoApiFetch<AuthoritySession>("/auth/session");
    expect(session.displayName).toBe("Sudhanshu Patel");
  });
});

