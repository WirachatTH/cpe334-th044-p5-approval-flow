import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ROUTE_POLICIES } from "../../src/authorization.js";
import { ACCOUNTS, ORIGIN, PASSWORD, setCookies, signedIn, startTestApp, type TestApp } from "./helpers/app.js";

// F-02: who may call which route, decided on the server (contract §1.6 and §3, AC-F02-01 to 05, 07 to 09, 14).

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp();
});
afterAll(async () => {
  await t?.drop();
});
beforeEach(() => t.throttle.clear());

const ROLES_ROUTES: Array<[method: "get" | "post", path: string]> = [
  ["get", "/api/auth/me"],
  ["get", "/api/reviewers"],
  ["post", "/api/requests"],
  ["get", "/api/requests/mine"],
  ["get", "/api/requests/1"],
  ["get", "/api/reviews/inbox"],
  ["post", "/api/requests/1/decision"],
];

describe("role-based access", () => {
  it.each(ROLES_ROUTES)("TEST-F02-01 / AC-F02-01: %s %s without a session is 401 with no data", async (method, path) => {
    const res = await request(t.app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
    expect(Object.keys(res.body)).toEqual(["error"]);
  });

  it("TEST-F02-02 / AC-F02-02: public and optional routes never answer 401 or 403", async () => {
    const health = await request(t.app).get("/api/health");
    const ready = await request(t.app).get("/api/ready");
    const login = await request(t.app).post("/api/auth/login").send({ email: ACCOUNTS.ploy, password: PASSWORD });
    const logout = await request(t.app).post("/api/auth/logout");
    for (const res of [health, ready, login, logout]) expect([401, 403]).not.toContain(res.status);
    expect(logout.status).toBe(204);
  });

  it("TEST-F02-03 / AC-F02-03: a requester cannot use review operations, even with a malformed body", async () => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const inbox = await agent.get("/api/reviews/inbox");
    const decision = await agent.post("/api/requests/1/decision").send({ decision: "APPROVE" });
    const malformed = await agent
      .post("/api/requests/1/decision")
      .set("Content-Type", "application/json")
      .send('{"decision":');
    for (const res of [inbox, decision, malformed]) {
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    }
  });

  it("TEST-F02-04 / AC-F02-04: every role a route allows gets past the policy checks", async () => {
    const listed = ROUTE_POLICIES.filter((p) => p.access.kind === "roles").map((p) => `${p.method} ${p.path}`);
    for (const [method, path] of ROLES_ROUTES) {
      const pattern = path.replace(/\/\d+/, "/:id");
      expect(listed, `${method} ${pattern} is in ROUTE_POLICIES`).toContain(`${method.toUpperCase()} ${pattern}`);
    }

    const agents = { REQUESTER: await signedIn(t, ACCOUNTS.ploy), REVIEWER: await signedIn(t, ACCOUNTS.mint) };
    for (const policy of ROUTE_POLICIES) {
      if (policy.access.kind !== "roles") continue;
      for (const role of policy.access.roles) {
        const path = policy.path.replace(":id", "1");
        const agent = agents[role];
        const res = policy.method === "GET" ? await agent.get(path) : await agent.post(path).send({});
        const code = res.body?.error?.code;
        expect(code, `${role} ${policy.method} ${path} -> ${res.status} ${code}`).not.toBe("UNAUTHENTICATED");
        expect(code, `${role} ${policy.method} ${path} -> ${res.status} ${code}`).not.toBe("FORBIDDEN");
      }
    }
  });

  it.each([["anonymous"], ["reviewer"]])("TEST-F02-05 / AC-F02-05: unlisted routes are 404 for the %s", async (who) => {
    const caller = who === "reviewer" ? await signedIn(t, ACCOUNTS.mint) : request(t.app);
    const calls = [
      caller.delete("/api/requests/1"),
      caller.patch("/api/requests/1"),
      caller.get("/api/admin/users"),
      caller.get("/api/nope"),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
      expect(Object.keys(res.body)).toEqual(["error"]);
    }
  });

  it("TEST-F02-07 / AC-F02-07: identity headers sent by a client are ignored", async () => {
    const reviewer = await t.prisma.user.findUniqueOrThrow({ where: { email: ACCOUNTS.mint } });
    const forged = {
      "X-User-Id": String(reviewer.id),
      "X-Role": "REVIEWER",
      "X-Requester-Id": String(reviewer.id),
    };
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const ploy = await t.prisma.user.findUniqueOrThrow({ where: { email: ACCOUNTS.ploy } });

    const me = await agent.get("/api/auth/me").set(forged);
    expect(me.body.user).toMatchObject({ id: ploy.id, role: "REQUESTER" });
    expect((await agent.get("/api/reviews/inbox").set(forged)).status).toBe(403);

    expect((await request(t.app).get("/api/auth/me").set(forged)).status).toBe(401);
    expect((await request(t.app).get("/api/reviews/inbox").set(forged)).status).toBe(401);
  });

  it.each([
    ["get", "/api/reviews/inbox/"],
    ["get", "/API/REVIEWS/INBOX"],
    ["get", "//api/reviews/inbox"],
    ["post", "/api/requests/1/decision/"],
    ["post", "/api/Requests/1/decision"],
  ] as const)("TEST-F02-14 / AC-F02-14: the path variant %s %s is not a route", async (method, path) => {
    const agent = await signedIn(t, ACCOUNTS.ploy);
    const res = await agent[method](path);
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe("NOT_FOUND");
  });
});

describe("cross-origin guard and guard order", () => {
  it("TEST-F02-08 / AC-F02-08: a foreign Origin is refused before sign-in and never counted by the throttle", async () => {
    const before = await t.prisma.session.count();
    const post = (origin?: string, body: object = { email: ACCOUNTS.ploy, password: PASSWORD }) => {
      const req = request(t.app).post("/api/auth/login");
      return (origin === undefined ? req : req.set("Origin", origin)).send(body);
    };

    for (const origin of ["https://evil.example", "null"]) {
      const res = await post(origin);
      expect(res.status, `Origin ${origin}`).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN_ORIGIN");
      expect(res.headers["set-cookie"]).toBeUndefined();
    }
    expect(await t.prisma.session.count()).toBe(before);

    // Six wrong passwords from a foreign origin are refused before the throttle sees them.
    for (let i = 0; i < 6; i += 1) {
      expect((await post("https://evil.example", { email: ACCOUNTS.ploy, password: "Wrong-Password-9" })).status).toBe(403);
    }

    expect((await post(undefined)).status).toBe(200);
    expect((await post(ORIGIN)).status).toBe(200);
    expect(await t.prisma.session.count()).toBe(before + 2);

    const agent = await signedIn(t, ACCOUNTS.korn);
    const refused = await agent.post("/api/auth/logout").set("Origin", "https://evil.example");
    expect(refused.status).toBe(403);
    expect((await agent.get("/api/auth/me")).status, "the refused logout left the session alive").toBe(200);
  });

  it("TEST-F02-09 / AC-F02-09: the origin guard comes before the session check, which comes before the role check", async () => {
    const foreign = await request(t.app).post("/api/requests").set("Origin", "https://evil.example");
    expect(foreign.status).toBe(403);
    expect(foreign.body.error?.code).toBe("FORBIDDEN_ORIGIN");

    const anonymous = await request(t.app).get("/api/reviews/inbox");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error?.code).toBe("UNAUTHENTICATED");
    expect(setCookies(anonymous)).toEqual([]);
  });
});
