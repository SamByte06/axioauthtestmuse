/**
 * Auth boundary E2E — the console never fakes authentication.
 */
import { expect, test } from "@playwright/test";
import {
  mockApi,
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
} from "./helpers";

test("login page renders the Authority sign-in form", async ({ page }) => {
  await mockUnauthenticatedSession(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Authority sign-in" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("login rejects an invalid email client-side", async ({ page }) => {
  await mockUnauthenticatedSession(page);
  await page.goto("/login");
  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("valid email");
});

test("login failure against an unreachable backend is honest, never fake success", async ({
  page,
}) => {
  await mockUnauthenticatedSession(page);
  // No mock for /auth/login → the request goes to the unreachable host.
  await page.goto("/login");
  await page.getByLabel("Work email").fill("admin@axiovital.test");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/unavailable|failed/i);
  // Must NOT navigate to the dashboard on failure.
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated visits to /dashboard redirect to /login", async ({
  page,
}) => {
  await mockUnauthenticatedSession(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("authenticated session renders the dashboard shell", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await mockApi(page, "dashboard", {
    status: 200,
    body: {
      activePartners: 3,
      pendingPartners: 1,
      suspendedPartners: 0,
      activeOperators: 42,
      pendingEnrollments: 2,
      provisioningJobs: 1,
      infrastructure: [
        {
          component: "Backend API",
          state: "HEALTHY",
          checkedAt: new Date().toISOString(),
        },
      ],
    },
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Network Dashboard" }),
  ).toBeVisible();
  await expect(page.getByText("Test Authority Admin")).toBeVisible();
  await expect(page.getByText("Active partners")).toBeVisible();
});
