import { beforeAll, describe, expect, it } from "vitest";
import { TSC_CLI, childEnv, freePort, run, start, waitForHttp } from "./helpers/run.js";

// F-05 §1.2 step 3: the built server (node dist/index.js) either starts, or exits with code 1 before opening a port.

describe("the built server process", () => {
  beforeAll(async () => {
    const build = await run([TSC_CLI, "-p", "tsconfig.build.json"], childEnv(), 120_000);
    expect(build.code, `tsc failed:\n${build.stdout}${build.stderr}`).toBe(0);
  }, 120_000);

  it("TEST-F05-11 / AC-F05-11: a broken production configuration exits with code 1 and never listens", async () => {
    const port = await freePort();
    const result = await run(["dist/index.js"], childEnv({ NODE_ENV: "production", PORT: String(port) }), 10_000);

    expect(result.timedOut, "the process must exit by itself within 10 s").toBe(false);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL");
    expect(result.stderr).toContain("CLIENT_ORIGINS");
    expect(result.stdout).not.toContain("listening");
  });

  it("TEST-F05-12 / AC-F05-12: PORT=4123 with a valid configuration serves /api/health on that port", async () => {
    const server = start(
      ["dist/index.js"],
      childEnv({
        NODE_ENV: "development",
        PORT: "4123",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://app:app@localhost:5433/app",
      }),
    );
    try {
      const response = await waitForHttp("http://127.0.0.1:4123/api/health", 10_000);
      expect(response, "nothing answered on port 4123").not.toBeNull();
      expect(response!.status).toBe(200);
    } finally {
      server.stop();
    }
  });
});
