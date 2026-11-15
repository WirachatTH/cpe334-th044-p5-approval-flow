import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// For local runs, take DEMO_USER_PASSWORD from server/.env when it is not already set. It is only passed on to
// the tests; it is never printed or written anywhere.
const serverEnv = path.resolve(import.meta.dirname, "../server/.env");
if (process.env.DEMO_USER_PASSWORD === undefined && existsSync(serverEnv)) {
  const line = readFileSync(serverEnv, "utf8").split("\n").map((l) => l.trim()).find((l) => l.startsWith("DEMO_USER_PASSWORD="));
  if (line) process.env.DEMO_USER_PASSWORD = line.slice("DEMO_USER_PASSWORD=".length);
}

// End-to-end tests (client/e2e/sprint-1/...) drive a dedicated Vite instance on port 5174 that proxies /api
// to the API (API_PROXY_TARGET, default http://localhost:3000), which must be running on a seeded database.
// Browser requests carry the Origin http://localhost:5174, so the API's CLIENT_ORIGINS must include it.
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
