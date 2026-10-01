import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --port ${PORT} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Point at an unreachable host: tests assert HONEST failure states
      // by default, and use page.route() interception for mocked success.
      NEXT_PUBLIC_AUTHORITY_API_BASE_URL: "http://127.0.0.1:1",
      NEXT_PUBLIC_AUTHORITY_ENVIRONMENT: "test",
    },
  },
});
