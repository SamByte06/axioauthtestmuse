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



  Operator,



  SessionRevocationSummary,



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







  it("dashboard reports registeredHospitals and totalEmployees counters (D-1)", async () => {



    await login();



    const dash = await demoApiFetch<DashboardSummary>("/dashboard");



    expect(dash.registeredHospitals).toBeGreaterThanOrEqual(1);



    expect(dash.totalEmployees).toBeGreaterThan(0);



    expect(dash.totalAdministrators).toBeGreaterThan(0);



  });







  it("partners list includes adminCount and employeeCount (D-2 / SA-6)", async () => {



    await login();



    const page = await demoApiFetch<PaginatedResponse<Partner>>("/partners", {



      query: { page: 1, pageSize: 25 },



    });



    const medanta = page.data.find((p) => p.id === "AXP-KL-7K42F8");



    expect(medanta).toBeDefined();



    expect(medanta?.adminCount).toBeGreaterThanOrEqual(1);



    expect(typeof medanta?.employeeCount).toBe("number");



  });







  it("reactivates a suspended operator with reason (SA-7)", async () => {



    await login();



    // AXO-QM2041-S00001 is suspended in fixtures



    const reactivated = await demoApiFetch<Operator>(



      "/operators/AXO-QM2041-S00001/reactivate",



      {



        method: "POST",



        body: { reason: "Security review completed and cleared by admin." },



      },



    );



    expect(reactivated.status).toBe("ACTIVE");







    // Short reason rejected



    await expect(



      demoApiFetch("/operators/AXO-QM2041-S00001/reactivate", {



        method: "POST",



        body: { reason: "short" },



      }),



    ).rejects.toMatchObject({ status: 422 });



  });







  it("updates operator role and records audit event", async () => {



    await login();



    const updated = await demoApiFetch<Operator>(



      "/operators/AXO-7K42F8-A00001/role",



      {



        method: "PATCH",



        body: { type: "D", reason: "Reassigned to doctor specialist role." },



      },



    );



    expect(updated.type).toBe("D");







    const audit = await demoApiFetch<PaginatedResponse<AuditEvent>>("/audit", {



      query: { action: "OPERATOR_ROLE_CHANGED" },



    });



    expect(audit.data[0]?.resource).toBe("AXO-7K42F8-A00001");



  });







  it("resets operator credential recovery and issues single-use reference (SA-8)", async () => {



    await login();



    const res = await demoApiFetch<{ enrollmentReference: string; expiresAt: string }>(



      "/operators/AXO-7K42F8-A00001/credential/reset",



      {



        method: "POST",



        body: { reason: "Operator forgot MFA device and completed ID proofing." },



      },



    );



    expect(res.enrollmentReference).toMatch(/^(ENR|DEMO-RESET)-/);



    expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());



  });







  it("revokes operator and partner sessions (SA-9)", async () => {



    await login();



    const opRevoke = await demoApiFetch<SessionRevocationSummary>(



      "/operators/AXO-7K42F8-A00001/sessions/revoke",



      {



        method: "POST",



        body: { reason: "Immediate credential rotation requirement." },



      },



    );



    expect(opRevoke.revokedSessionsCount).toBeGreaterThanOrEqual(1);







    const partnerRevoke = await demoApiFetch<SessionRevocationSummary>(



      "/partners/AXP-KL-7K42F8/sessions/revoke",



      {



        method: "POST",



        body: { reason: "Partner security incident containment protocol." },



      },



    );



    expect(partnerRevoke.revokedSessionsCount).toBeGreaterThanOrEqual(1);



  });



});







