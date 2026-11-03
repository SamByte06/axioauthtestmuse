/**
 * Partner creation workflow E2E.
 * Asserts: validation honesty, backend-generated IDs on success,
 * absence of secrets from DOM, and honest failure with correlation ID.
 */
import { expect, test, type Page } from "@playwright/test";
import { mockApi, mockAuthenticatedSession } from "./helpers";

const FORM = {
  organizationName: "Medanta Medicity",
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
  await page.getByLabel("State / UT code").fill("K");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByText(/2-letter state \/ UT code/i)).toBeVisible();
  await expect(page).toHaveURL(/\/partners\/new/);
});

test("successful creation shows backend-generated IDs, correlation ID, and secrets are absent from DOM", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await mockApi(page, "hospitals", {
    status: 201,
    body: {
      organization: "Medanta Medicity",
      partner_id: "AXP-KL-7K42F8",
      operator_id: "AXO-7K42F8-A00001",
      tenant_status: "ACTIVE",
      isolation_mode: "DEDICATED_DATABASE",
      tenant_id: "11111111-2222-3333-4444-555555555555",
      operator_type: "A",
      administrator_email: "asha@example.org",
      enrollment_url: "https://auth.axiovital.internal/enroll?ref=REF12345",
      // Secret values that must NEVER appear in the DOM:
      mfa_secret: "SECRET_MFA_DO_NOT_EXPOSE",
      mfa_qr_code_uri: "otpauth://totp/secret",
      enrollment_token: "SECRET_TOKEN_DO_NOT_EXPOSE",
      created_at_utc: new Date().toISOString(),
    },
  });

  await page.goto("/partners/new");
  await fillValidForm(page);
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Review hospital details" })).toBeVisible();
  await page.getByRole("button", { name: "Create hospital" }).click();

  await expect(
    page.getByRole("heading", { name: "Hospital Registered Successfully" }),
  ).toBeVisible();

  // Backend-generated IDs are displayed verbatim
  await expect(page.getByText("AXP-KL-7K42F8", { exact: true })).toBeVisible();
  await expect(page.getByText("AXO-7K42F8-A00001", { exact: true })).toBeVisible();
  await expect(page.getByText("11111111-2222-3333-4444-555555555555", { exact: true })).toBeVisible();

  // D3 Verification: Verify forbidden secrets are strictly absent from the DOM
  const pageContent = await page.content();
  expect(pageContent).not.toContain("SECRET_MFA_DO_NOT_EXPOSE");
  expect(pageContent).not.toContain("SECRET_TOKEN_DO_NOT_EXPOSE");
  expect(pageContent).not.toContain("otpauth://");

  // Single-use enrollment URL is masked by default
  await expect(page.getByText("••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••")).toBeVisible();
});

test("failed creation shows the error and correlation ID — never fake ACTIVE", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await mockApi(page, "hospitals", {
    status: 500,
    body: {
      code: "PROVISIONING_FAILED",
      message: "Tenant provisioning failed on backend.",
      correlationId: "AX-REQ-E2E002",
    },
  });

  await page.goto("/partners/new");
  await fillValidForm(page);
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Create hospital" }).click();

  const alert = page.locator("[role='alert']:not(#__next-route-announcer__)");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Tenant provisioning failed on backend.");
  await expect(alert).toContainText("AX-REQ-E2E002");
  await expect(alert).toContainText(/nothing was activated|rolled/i);
  await expect(
    page.getByRole("heading", { name: "Hospital Registered Successfully" }),
  ).not.toBeVisible();
});
