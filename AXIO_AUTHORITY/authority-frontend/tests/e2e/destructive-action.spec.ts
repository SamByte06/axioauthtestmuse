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

  await page.getByRole("button", { name: "Suspend partner" }).click();
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
