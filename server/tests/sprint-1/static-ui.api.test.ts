import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { ConfigError, type AppConfig } from "../../src/config.js";

// F-05 section 2.2, "Serving the UI" (v0.7, AC-F05-23 to AC-F05-27): with CLIENT_DIST_DIR set, the one server serves
// the built UI and the API. No test here needs a database: the Prisma client is a stub that throws if anything uses it.

const INDEX_MARKER = "UI-TEST-MARKER-index-8f3a";
const SCRIPT = "console.log('UI-TEST-MARKER-script-5c1d');\n";
const OUTSIDE_MARKER = "OUTSIDE-TEST-MARKER-2b7e";

// Any property can be read from it, and calling anything on it throws, so a use of the database shows up as a 500.
function unused(path: string): unknown {
  return new Proxy(function () {}, {
    get: (_target, property) => (property === "then" ? undefined : unused(`${path}.${String(property)}`)),
    apply: () => {
      throw new Error(`the database was used: ${path}`);
    },
  });
}
const prisma = unused("prisma") as PrismaClient;

const base: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl: "postgresql://app:app@localhost:5433/app",
  clientOrigins: ["http://localhost:5173"],
};

let root: string;
let dist: string;
let emptyDir: string;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "approval-flow-ui-"));
  dist = join(root, "dist");
  emptyDir = join(root, "empty");
  mkdirSync(join(dist, "assets"), { recursive: true });
  mkdirSync(emptyDir);
  writeFileSync(join(dist, "index.html"), `<!doctype html><title>${INDEX_MARKER}</title><div id="root"></div>\n`);
  writeFileSync(join(dist, "assets", "app.js"), SCRIPT);
  writeFileSync(join(root, "outside.txt"), OUTSIDE_MARKER);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const serving = () => createApp({ prisma, config: { ...base, clientDistDir: dist } });

// supertest only keeps the body of text types; this keeps every body as text.
const asText = (res: unknown, done: (error: Error | null, body: string) => void) => {
  const stream = res as NodeJS.ReadableStream;
  let data = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => (data += chunk));
  stream.on("end", () => done(null, data));
};
const get = (app: ReturnType<typeof createApp>, path: string) => request(app).get(path).buffer(true).parse(asText);

describe("serving the built UI", () => {
  it("TEST-F05-23 / AC-F05-23: the page, a deep link, and a file are served to anyone", async () => {
    const app = serving();
    for (const path of ["/", "/requests/12", "/index.html"]) {
      const res = await get(app, path);
      expect(res.status, path).toBe(200);
      expect(res.body, path).toContain(INDEX_MARKER);
      expect(res.headers["set-cookie"], path).toBeUndefined();
    }
    for (const path of ["/", "/requests/12"]) {
      expect((await get(app, path)).headers["cache-control"], path).toBe("no-cache");
    }
    expect((await request(app).head("/")).status).toBe(200);

    const script = await get(app, "/assets/app.js");
    expect(script.status).toBe(200);
    expect(script.body).toBe(SCRIPT);
    expect(script.headers["content-type"]).toMatch(/javascript/);
  });

  it("TEST-F05-24 / AC-F05-24: the API is unchanged while the UI is served", async () => {
    const app = serving();
    // Control: the UI really is being served, so the answers below are not just a switched-off feature.
    expect((await get(app, "/")).body).toContain(INDEX_MARKER);

    const health = await get(app, "/api/health");
    expect(health.status).toBe(200);
    expect(JSON.parse(health.body)).toEqual({ status: "ok" });

    const unknown = await get(app, "/api/nope");
    expect(unknown.status).toBe(404);
    expect(JSON.parse(unknown.body).error.code).toBe("NOT_FOUND");
    expect(unknown.body).not.toContain(INDEX_MARKER);

    const mine = await get(app, "/api/requests/mine");
    expect(mine.status).toBe(401);
    expect(JSON.parse(mine.body).error.code).toBe("UNAUTHENTICATED");

    const post = await request(app).post("/requests").send({}).buffer(true).parse(asText);
    expect(post.status).toBe(404);
    expect(JSON.parse(post.body).error.code).toBe("NOT_FOUND");
    expect(post.body).not.toContain(INDEX_MARKER);

    expect((await request(app).post("/api/auth/logout")).status).toBe(204);
  });

  it("TEST-F05-25 / AC-F05-25: nothing outside the directory is served", async () => {
    const app = serving();
    // Control: serving is on, and the file really exists next to the directory.
    expect((await get(app, "/index.html")).body).toContain(INDEX_MARKER);

    for (const path of ["/../outside.txt", "/%2e%2e/outside.txt", "/..%2foutside.txt", "/assets/..%2f..%2foutside.txt"]) {
      const res = await get(app, path);
      expect(res.body, path).not.toContain(OUTSIDE_MARKER);
    }
  });

  it("TEST-F05-28 / AC-F05-28: a missing file with an extension is a 404, not the page, and deep links still work", async () => {
    const app = serving();
    // Control: serving is on, so the answers below are not just a switched-off feature.
    expect((await get(app, "/requests/12")).body).toContain(INDEX_MARKER);
    expect((await get(app, "/assets/app.js")).body).toBe(SCRIPT);

    for (const path of ["/assets/missing.js", "/missing.css", "/favicon.ico"]) {
      const res = await get(app, path);
      expect(res.status, path).toBe(404);
      expect(JSON.parse(res.body).error.code, path).toBe("NOT_FOUND");
      expect(res.body, path).not.toContain(INDEX_MARKER);
    }
    expect((await request(app).head("/assets/missing.js")).status).toBe(404);
  });

  it("TEST-F05-26 / AC-F05-26: without CLIENT_DIST_DIR the UI is not served", async () => {
    const app = createApp({ prisma, config: base });
    for (const path of ["/", "/requests/12"]) {
      const res = await get(app, path);
      expect(res.status, path).toBe(404);
      expect(JSON.parse(res.body).error.code, path).toBe("NOT_FOUND");
    }
  });

  it("TEST-F05-27 / AC-F05-27: a directory without index.html is refused when the app is created", () => {
    let error: unknown;
    try {
      createApp({ prisma, config: { ...base, clientDistDir: emptyDir } });
    } catch (caught) {
      error = caught;
    }
    expect(error, "createApp throws").toBeInstanceOf(ConfigError);
    expect((error as ConfigError).message).toBe("config: CLIENT_DIST_DIR has no index.html");
    expect((error as ConfigError).message).not.toContain(emptyDir);
  });
});
