/**
 * E2E helpers — explicit, labelled backend mocks.
 * Every mock is declared per-test via page.route(); nothing here pretends
 * to be a real backend.
 */
import type { Page, Route } from "@playwright/test";
import type { AuthoritySession } from "@axio-authority/shared-types";
import { ROLE_PERMISSIONS } from "@axio-authority/shared-types";

export const API = "**/api/v1/authority/**";

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
  await page.route(`${API}auth/session`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fullSession()),
    }),
  );
}

/** Mock an unauthenticated session (backend returns 401). */
export async function mockUnauthenticatedSession(page: Page) {
  await page.route(`${API}auth/session`, (route: Route) =>
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
  await page.route(`${API}${pathSuffix}`, (route: Route) =>
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    }),
  );
}
