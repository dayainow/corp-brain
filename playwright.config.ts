import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3001;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run build && npx next start -p 3001"
      : "npx next dev -p 3001",
    url: `${E2E_BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      AUTH_SECRET: "e2e-test-secret-at-least-32-chars-long",
      AUTH_URL: E2E_BASE_URL,
      VAULT_PATH: "./vault",
      PORT: String(E2E_PORT),
    },
  },
});
