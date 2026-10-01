/**
 * Partner creation workflow E2E.
 * Asserts: validation honesty, backend-generated IDs on success,
 * and honest failure (no fake ACTIVE) with a correlation ID.
 */
import { expect, test, type Page } from "@playwright/test";
import { mockApi, mockAuthenticatedSession } from "./helpers";

const FORM = {
  organizationName: "Medanta",
  state: "KL",
  adminFullName: "Asha Nair",
  adminEmail: "asha@example.org",
};

async function fillValidForm(page: Page) {
  await page.getByLabel("Organization name").fill(FORM.organizationName);
  await page.getByLabel("State / UT code").fill(FORM.state);
  await page.getByLabel("Administrative contact — full name").fill(FORM.adminFullName);
  await page.getByLabel("Administrative contact — email").fill(FORM.adminEmail);
}

test("wizard blocks an invalid state code with a clear error", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/partners/new");
  await fillValidForm(page);
  await page.getByLabel("State / UT code").fill("KERALA");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText("2-letter state / UT code")).toBeVisible();
  await expect(page).toHaveURL(/\/partners\/new/);
});

test("successful creation shows backend-generated IDs and correlation ID", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await mockApi(page, "partners", {
    status: 201,
    body: {
      partner: {
        id: "AXP-KL-7K42F8",
        organizationName: "Medanta",
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
      },
      tenant: {
        id: "tnt-1",
        partnerId: "AXP-KL-7K42F8",
        organizationName: "Medanta",
        region: "KL",
        isolationMode: "DEDICATED_DATABASE",
        lifecycle: "ACTIVE",
        provisioningStatus: { state: "COMPLETED" },
        operatorCount: 1,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initialOperator: {
        id: "AXO-7K42F8-A00001",
        partnerId: "AXP-KL-7K42F8",
        displayName: "Asha Nair",
        type: "A",
        status: "PENDING",
        email: "asha@example.org",
        credentialState: "PENDING_ENROLLMENT",
        createdAt: new Date().toISOString(),
      },
      correlationId: "AX-REQ-E2E001",
    },
  });

  await page.goto("/partners/new");
  await fillValidForm(page);
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review before submission" })).toBeVisible();
  await page.getByRole("button", { name: "Create partner" }).click();

  await expect(
    page.getByRole("heading", { name: "Partner created and active" }),
  ).toBeVisible();
  // Backend-generated IDs are displayed — never invented by the UI.
  await expect(page.getByText("AXP-KL-7K42F8")).toBeVisible();
  await expect(page.getByText("AXO-7K42F8-A00001")).toBeVisible();
  await expect(page.getByText("AX-REQ-E2E001")).toBeVisible();
});

test("failed creation shows the error and correlation ID — never fake ACTIVE", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await mockApi(page, "partners", {
    status: 500,
    body: {
      code: "PROVISIONING_FAILED",
      message: "Tenant provisioning failed.",
      correlationId: "AX-REQ-E2E002",
    },
  });

  await page.goto("/partners/new");
  await fillValidForm(page);
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Create partner" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Tenant provisioning failed.");
  await expect(alert).toContainText("AX-REQ-E2E002");
  await expect(alert).toContainText(/nothing was activated|rolled/i);
  await expect(
    page.getByRole("heading", { name: "Partner created and active" }),
  ).not.toBeVisible();
});
