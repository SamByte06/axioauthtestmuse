/**
 * E2E helpers — explicit, labelled backend mocks.
 * Every mock is declared per-test via page.route(); nothing here pretends
 * to be a real backend.
 */
import type { Page, Route } from "@playwright/test";
import type { AuthoritySession } from "@axio-authority/shared-types";
import { ROLE_PERMISSIONS } from "@axio-authority/shared-types";

export const COOKIE_NAME = process.env.AUTHORITY_SESSION_COOKIE_NAME || "axio_authority_session";

export function fullSession(): AuthoritySession {
  return {
    administratorId: "adm-test-1",
    displayName: "Test Authority Admin",
    email: "admin@axiovital.test",
    roles: ["SUPER_AUTHORITY_ADMIN"],
    permissions: ROLE_PERMISSIONS.SUPER_AUTHORITY_ADMIN,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

/** Mock an authenticated Authority session for all subsequent API calls. */
export async function mockAuthenticatedSession(page: Page) {
  // Set session cookie so Next.js middleware passes through
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: "mock-session-token-e2e",
      url: "http://127.0.0.1:3100",
    },
    {
      name: COOKIE_NAME,
      value: "mock-session-token-e2e",
      url: "http://localhost:3100",
    },
  ]);

  await page.route("**/api/**/auth/session*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fullSession()),
    }),
  );
  await page.route("**/api/**/auth/me*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fullSession()),
    }),
  );
}

/** Mock an unauthenticated session (backend returns 401). */
export async function mockUnauthenticatedSession(page: Page) {
  await page.context().clearCookies();
  await page.route("**/api/**/auth/session*", (route: Route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "UNAUTHENTICATED", message: "No session." }),
    }),
  );
  await page.route("**/api/**/auth/me*", (route: Route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "UNAUTHENTICATED", message: "No session." }),
    }),
  );
}

/** Generic JSON mock for an Authority API path suffix. */
export async function mockApi(
  page: Page,
  pathSuffix: string,
  response: { status: number; body: unknown },
) {
  const escaped = pathSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`.*/api/.*/${escaped}(\\?.*)?$`);
  await page.route(regex, (route: Route) =>
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    }),
  );
}
