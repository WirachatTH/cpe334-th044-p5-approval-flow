import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { AppConfig } from "../../src/config.js";
import { ACCOUNTS, signedIn, startTestApp, type TestApp } from "./helpers/app.js";

// F-02 safe errors: nothing internal reaches a response (contract §1.2 steps 5 and 7, AC-F02-10, 13, 15).

const config: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl: "postgresql://app:app@localhost:5433/app",
  clientOrigins: ["http://localhost:5173"],
};

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

describe("safe error responses", () => {
  it("TEST-F02-10 / AC-F02-10: a database error is a fixed 500, and a malformed body is a fixed 400", async () => {
    const throwing = {
      session: {
        findUnique: () => {
          throw new Error("SECRET-DETAIL");
        },
      },
    } as unknown as PrismaClient;
    const failed = await request(createApp({ prisma: throwing, config }))
      .get("/api/auth/me")
      .set("Cookie", "af_session=anything");
    expect(failed.status).toBe(500);
    expect(failed.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    });
    expect(failed.text).not.toContain("SECRET-DETAIL");
    expect(failed.text).not.toContain("    at ");

    const malformed = await request(t.app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toMatchObject({ code: "VALIDATION_ERROR", message: "Some fields need attention." });
    expect(malformed.text).not.toContain("Unexpected");
    expect(malformed.text).not.toContain("JSON");
  });

  it("TEST-F02-13 / AC-F02-13: health and readiness never look up a session", async () => {
    const findUnique = vi.fn().mockRejectedValue(new Error("session table is broken"));
    const prisma = { session: { findUnique }, $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) } as unknown as PrismaClient;
    const app = createApp({ prisma, config });

    for (const path of ["/api/health", "/api/ready"]) {
      const res = await request(app).get(path).set("Cookie", "af_session=anything");
      expect(res.status, path).toBe(200);
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("TEST-F02-15 / AC-F02-15: bodies of 102,400 bytes pass the size check, and 102,401 bytes are 413", async () => {
    const body = (bytes: number) => `{"x":"${"a".repeat(bytes - '{"x":""}'.length)}"}`;
    const sizes = { ok: body(102_400), tooLarge: body(102_401) };
    expect(Buffer.byteLength(sizes.ok)).toBe(102_400);
    expect(Buffer.byteLength(sizes.tooLarge)).toBe(102_401);

    const requester = await signedIn(t, ACCOUNTS.ploy);
    const send = (caller: { post: (p: string) => request.Test }, path: string, payload: string) =>
      caller.post(path).set("Content-Type", "application/json").send(payload);
    const anonymous = request(t.app);

    const login = await send(anonymous, "/api/auth/login", sizes.ok);
    expect(login.status).toBe(400);
    expect(login.body.error?.code).toBe("VALIDATION_ERROR");
    const requests = await send(requester, "/api/requests", sizes.ok);
    expect([400, 404], "not refused for its size").toContain(requests.status);

    for (const [caller, path] of [
      [anonymous, "/api/auth/login"],
      [requester, "/api/requests"],
    ] as const) {
      const res = await send(caller, path, sizes.tooLarge);
      expect(res.status, path).toBe(413);
      expect(res.body.error).toMatchObject({ code: "PAYLOAD_TOO_LARGE", message: "The request is too large." });
      expect(Object.keys(res.body)).toEqual(["error"]);
    }
  });
});
