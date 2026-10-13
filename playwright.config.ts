import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * End-to-end tests (docs/06-quality/testing-strategy.md) against `next dev` with a fresh
 * embedded database and the dev-only sign-in (ADR-0011). Locally they use the installed
 * Chrome; CI installs Playwright's Chromium.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: "pglite:./.data/e2e",
      AUTH_SECRET: "e2e-only-not-secret",
      AUTH_DEV_LOGIN: "1",
      DEV_LOGIN_EMAIL: "e2e@example.com",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      NEXT_DIST_DIR: ".next-e2e",
      MP_FAKE_NOW: "2026-10-15T10:00:00+05:30",
    },
  },
});
