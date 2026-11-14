import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNTS, PASSWORD, setCookies, signedIn, startTestApp, tokenOf, type TestApp } from "./helpers/app.js";

// F-01: sign-in, current user, and sign-out against a real database (contract §3, AC-F01-01 to 13, 20, 21).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const login = (email: string, password: unknown = PASSWORD) =>
  request(t.app).post("/api/auth/login").send({ email, password });
const sessions = () => t.prisma.session.count();
const setActive = (email: string, isActive: boolean) => t.prisma.user.update({ where: { email }, data: { isActive } });

describe("sign-in", () => {
  it.each([
    ["requester", ACCOUNTS.ploy, "Ploy Srisawat", "REQUESTER"],
    ["reviewer", ACCOUNTS.mint, "Mint Chaiyaporn", "REVIEWER"],
  ])("TEST-F01-01 / AC-F01-01: a %s signs in and gets a hashed, expiring session", async (_label, email, name, role) => {
    const before = await sessions();
    const res = await login(email);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(["user"]);
    expect(Object.keys(res.body.user).sort()).toEqual(["email", "id", "name", "role"]);
    expect(res.body.user).toMatchObject({ email, name, role });

    const cookie = setCookies(res).find((c) => c.startsWith("af_session="))!;
    for (const attribute of ["HttpOnly", "SameSite=Strict", "Path=/api", "Max-Age=28800"]) {
      expect(cookie.toLowerCase(), `cookie has ${attribute}`).toContain(attribute.toLowerCase());
    }

    expect(await sessions()).toBe(before + 1);
    const token = tokenOf(res);
    const row = await t.prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
    expect(row, "the stored token_hash is the SHA-256 of the cookie token").not.toBeNull();
    expect(row!.tokenHash).not.toBe(token);
    const hoursAhead = (row!.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(Math.abs(hoursAhead - 8)).toBeLessThan(1 / 60);
  });

  it("TEST-F01-02 / AC-F01-02: the email is trimmed and case-insensitive", async () => {
    const res = await login("  PLOY.Requester@Example.COM ");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ACCOUNTS.ploy);
  });

  it("TEST-F01-03 / AC-F01-03: a wrong password is refused with one message and no session", async () => {
    const before = await sessions();
    const res = await login(ACCOUNTS.ploy, "Wrong-Password-9");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(await sessions()).toBe(before);
  });

  it("TEST-F01-04 / AC-F01-04: an unknown email gets exactly the same answer as a wrong password", async () => {
    const before = await sessions();
    const wrongPassword = await login(ACCOUNTS.ploy, "Wrong-Password-9");
    const unknownEmail = await login("nobody@example.com", "Wrong-Password-9");
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error?.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(unknownEmail.headers["set-cookie"]).toBeUndefined();
    expect(await sessions()).toBe(before);
  });

  it("TEST-F01-05 / AC-F01-05: invalid bodies are 400, and are not counted by the throttle", async () => {
    const fields = (body: unknown, expected: Record<string, string> | undefined) =>
      request(t.app)
        .post("/api/auth/login")
        .send(body as object)
        .then((res) => {
          expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400);
          expect(res.body.error?.code).toBe("VALIDATION_ERROR");
          expect(res.body.error?.message).toBe("Some fields need attention.");
          expect(res.body.error?.fields).toEqual(expected);
        });

    const email = ACCOUNTS.ploy;
    // Six bodies that carry Ploy's email: more than the five failures the throttle allows.
    await fields({ email }, { password: "Enter your password." });
    await fields({ email, password: "" }, { password: "Enter your password." });
    await fields({ email, password: "x".repeat(129) }, { password: "Password is too long." });
    await fields({ email, password: null }, { password: "Enter your password." });
    await fields({ email, password: 123 }, { password: "Enter your password." });
    await fields({ email, password: [] }, { password: "Enter your password." });
    // Four bodies without a usable email.
    await fields({ password: PASSWORD }, { email: "Enter your email address." });
    await fields({ email: "   ", password: PASSWORD }, { email: "Enter your email address." });
    await fields({ email: `${"a".repeat(243)}@example.com`, password: PASSWORD }, { email: "Email address is too long." });
    await fields([], undefined);

    const ok = await login(email);
    expect(ok.status, "six validation errors for one email must not lock it").toBe(200);
  });

  it("TEST-F01-06 / AC-F01-06: an inactive account gets 403 for the right password and 401 for a wrong one", async () => {
    await setActive(ACCOUNTS.nattapong, false);
    try {
      const before = await sessions();
      const right = await login(ACCOUNTS.nattapong);
      expect(right.status).toBe(403);
      expect(right.body.error?.code).toBe("ACCOUNT_INACTIVE");
      const wrong = await login(ACCOUNTS.nattapong, "Wrong-Password-9");
      expect(wrong.status).toBe(401);
      expect(wrong.body.error?.code).toBe("INVALID_CREDENTIALS");
      expect(await sessions()).toBe(before);
    } finally {
      await setActive(ACCOUNTS.nattapong, true);
    }
  });

  it("TEST-F01-07 / AC-F01-07: after five wrong passwords the sixth attempt is 429, and other accounts are unaffected", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await login(ACCOUNTS.korn, "Wrong-Password-9")).status).toBe(401);
    }
    const before = await sessions();
    const blocked = await login(ACCOUNTS.korn);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error?.code).toBe("TOO_MANY_ATTEMPTS");
    expect(blocked.headers["retry-after"]).toMatch(/^\d+$/);
    const seconds = Number(blocked.headers["retry-after"]);
    expect(seconds).toBeGreaterThanOrEqual(1);
    expect(seconds).toBeLessThanOrEqual(900);
    expect(await sessions()).toBe(before);
    expect((await login(ACCOUNTS.mint)).status).toBe(200);
  });

  it("TEST-F01-20 / AC-F01-20: twenty simultaneous wrong passwords give five 401 and fifteen 429", async () => {
    const before = await sessions();
    const results = await Promise.all(Array.from({ length: 20 }, () => login(ACCOUNTS.ploy, "Wrong-Password-9")));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(15);
    expect(await sessions()).toBe(before);
  });
});

describe("current user and sign-out", () => {
  it("TEST-F01-09 / AC-F01-09: /me returns the signed-in user, and 401 without a valid session", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const signInBody = (await login(ACCOUNTS.ploy)).body;

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toEqual(signInBody);

    const anonymous = await request(t.app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error?.code).toBe("UNAUTHENTICATED");

    const forged = await request(t.app).get("/api/auth/me").set("Cookie", "af_session=made-up-token");
    expect(forged.status).toBe(401);
    expect(forged.body.error?.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-F01-10 / AC-F01-10: an expired session answers 401 and its row is deleted", async () => {
    const res = await login(ACCOUNTS.ploy);
    const token = tokenOf(res);
    await t.prisma.session.update({
      where: { tokenHash: sha256(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const me = await request(t.app).get("/api/auth/me").set("Cookie", `af_session=${token}`);
    expect(me.status).toBe(401);
    expect(await t.prisma.session.count({ where: { tokenHash: sha256(token) } })).toBe(0);
  });

  it("TEST-F01-11 / AC-F01-11: a session of a user who became inactive answers 401", async () => {
    const token = tokenOf(await login(ACCOUNTS.korn));
    await setActive(ACCOUNTS.korn, false);
    try {
      const me = await request(t.app).get("/api/auth/me").set("Cookie", `af_session=${token}`);
      expect(me.status).toBe(401);
    } finally {
      await setActive(ACCOUNTS.korn, true);
    }
  });

  it("TEST-F01-12 / AC-F01-12: logout deletes the session, clears the cookie, and the old cookie is refused", async () => {
    const res = await login(ACCOUNTS.ploy);
    const token = tokenOf(res);
    const before = await sessions();

    const out = await request(t.app).post("/api/auth/logout").set("Cookie", `af_session=${token}`);
    expect(out.status).toBe(204);
    const clearing = setCookies(out).find((c) => c.startsWith("af_session="))!;
    expect(clearing, "logout sets a clearing cookie").toBeDefined();
    expect(clearing).toContain("Max-Age=0");
    expect(clearing).toContain("Path=/api");
    expect(await sessions()).toBe(before - 1);

    const me = await request(t.app).get("/api/auth/me").set("Cookie", `af_session=${token}`);
    expect(me.status).toBe(401);
  });

  it("TEST-F01-13 / AC-F01-13: logout without a session is 204", async () => {
    const out = await request(t.app).post("/api/auth/logout");
    expect(out.status).toBe(204);
  });

  it("TEST-F01-21 / AC-F01-21: signing out in one browser leaves the other browser's session working", async () => {
    const before = await sessions();
    const a = await signedIn(t, ACCOUNTS.ploy);
    const b = await signedIn(t, ACCOUNTS.ploy);
    expect(await sessions()).toBe(before + 2);

    expect((await a.post("/api/auth/logout")).status).toBe(204);
    expect((await a.get("/api/auth/me")).status).toBe(401);
    expect((await b.get("/api/auth/me")).status).toBe(200);
    expect(await sessions()).toBe(before + 1);
  });
});
