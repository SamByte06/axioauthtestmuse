/**

 * Destructive-action gate E2E — suspend partner.

 * Asserts: confirmation requires typing the identifier + a real reason;

 * success is only shown after a real backend response.

 */

import { expect, test } from "@playwright/test";

import { mockApi, mockAuthenticatedSession } from "./helpers";



const PARTNER = {

  id: "AXP-KL-7K42F8",

  organizationName: "Medanta (TEST)",

  partnerType: "HOSPITAL",

  state: "KL",

  country: "India",

  isolationMode: "DEDICATED_DATABASE",

  status: "ACTIVE",

  operatorCount: 1,

  tenantId: "tnt-1",

  testFixture: true,

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),

};



test("suspend requires identifier confirmation and an audit reason", async ({

  page,

}) => {

  await mockAuthenticatedSession(page);

  await mockApi(page, "partners/AXP-KL-7K42F8", { status: 200, body: PARTNER });



  await page.goto("/partners/AXP-KL-7K42F8");

  await expect(

    page.getByRole("heading", { name: "Medanta (TEST)" }),

  ).toBeVisible();



  await page.getByRole("button", { name: /Suspend (partner|hospital)/i }).click();

  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();

  await expect(dialog).toContainText(

    "prevent associated operators from accessing",

  );



  const confirm = dialog.getByRole("button", { name: "Confirm suspension" });

  await expect(confirm).toBeDisabled();



  // Typing the wrong identifier keeps the gate closed.

  await dialog.getByLabel(/Type "AXP-KL-7K42F8" to confirm/).fill("WRONG-ID");

  await expect(confirm).toBeDisabled();



  // Correct identifier but a too-short reason keeps the gate closed.

  await dialog.getByLabel(/Type "AXP-KL-7K42F8" to confirm/).fill("AXP-KL-7K42F8");

  await dialog.getByLabel(/Reason/).fill("short");

  await expect(confirm).toBeDisabled();



  // Mock the backend suspension, then confirm for real.

  await mockApi(page, "partners/AXP-KL-7K42F8/suspend", {

    status: 200,

    body: { ...PARTNER, status: "SUSPENDED" },

  });

  await dialog.getByLabel(/Reason/).fill("Partner requested suspension in writing.");

  await expect(confirm).toBeEnabled();

  await confirm.click();



  await expect(dialog).not.toBeVisible();

  await expect(page.getByText("SUSPENDED").first()).toBeVisible();

});



test("revoke active sessions requires identifier confirmation and audit reason (SA-9)", async ({

  page,

}) => {

  await mockAuthenticatedSession(page);

  await mockApi(page, "partners/AXP-KL-7K42F8", { status: 200, body: PARTNER });



  await page.goto("/partners/AXP-KL-7K42F8");

  await expect(

    page.getByRole("heading", { name: "Medanta (TEST)" }),

  ).toBeVisible();



  await page.getByRole("button", { name: "Revoke active sessions" }).click();

  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();



  const confirm = dialog.getByRole("button", { name: "Revoke all sessions" });

  await expect(confirm).toBeDisabled();



  // Typing wrong ID keeps confirm disabled

  await dialog.getByLabel(/Type "AXP-KL-7K42F8" to confirm/).fill("WRONG-ID");

  await expect(confirm).toBeDisabled();



  // Correct ID but short reason keeps confirm disabled

  await dialog.getByLabel(/Type "AXP-KL-7K42F8" to confirm/).fill("AXP-KL-7K42F8");

  await dialog.getByLabel(/Reason/).fill("short");

  await expect(confirm).toBeDisabled();



  // Mock backend response

  await mockApi(page, "partners/AXP-KL-7K42F8/sessions/revoke", {

    status: 200,

    body: {

      revokedSessionsCount: 5,

      revokedAt: new Date().toISOString(),

      correlationId: "AX-REQ-TEST-1234",

      target: "AXP-KL-7K42F8",

    },

  });



  await dialog.getByLabel(/Reason/).fill("Suspected compromise incident response.");

  await expect(confirm).toBeEnabled();

  await confirm.click();



  await expect(dialog).not.toBeVisible();

});

test("disable tenant requires identifier confirmation and audit reason", async ({
  page,
}) => {
  const TENANT = {
    id: "TNT-KL-0001",
    partnerId: "AXP-KL-7K42F8",
    organizationName: "Medanta (TEST)",
    region: "in-south-1",
    isolationMode: "DEDICATED_DATABASE",
    lifecycle: "ACTIVE",
    provisioningStatus: { state: "COMPLETED" },
    operatorCount: 1,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await mockAuthenticatedSession(page);
  await mockApi(page, "tenants/TNT-KL-0001", { status: 200, body: TENANT });

  await page.goto("/tenants/TNT-KL-0001");
  await expect(page.getByRole("heading", { name: "TNT-KL-0001" })).toBeVisible();
  await expect(page.getByText("Medanta (TEST)")).toBeVisible();

  await page.getByRole("button", { name: "Suspend tenant" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const confirm = dialog.getByRole("button", { name: "Confirm suspension" });
  await expect(confirm).toBeDisabled();

  // Typing wrong ID keeps confirm disabled
  await dialog.getByLabel(/Type "TNT-KL-0001" to confirm/).fill("WRONG-ID");
  await expect(confirm).toBeDisabled();

  // Correct ID but short reason keeps confirm disabled
  await dialog.getByLabel(/Type "TNT-KL-0001" to confirm/).fill("TNT-KL-0001");
  await dialog.getByLabel(/Reason/).fill("short");
  await expect(confirm).toBeDisabled();

  // Mock backend disable response
  await mockApi(page, "tenants/TNT-KL-0001/disable", {
    status: 200,
    body: { ...TENANT, status: "SUSPENDED", lifecycle: "SUSPENDED" },
  });
  await mockApi(page, "tenants/TNT-KL-0001", {
    status: 200,
    body: { ...TENANT, status: "SUSPENDED", lifecycle: "SUSPENDED" },
  });

  await dialog.getByLabel(/Reason/).fill("Security quarantine protocol initiated.");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(dialog).not.toBeVisible();
});
