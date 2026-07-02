import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          AUTH_SECRET: "e2e-test-secret-at-least-32-chars-long",
          AUTH_URL: "http://localhost:3000",
        },
      }
    : undefined,
});
