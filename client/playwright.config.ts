import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (client/e2e/sprint-1/...) drive a dedicated Vite instance on port 5174 that proxies /api
// to the API on port 3000, which must be running with a seeded database.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
