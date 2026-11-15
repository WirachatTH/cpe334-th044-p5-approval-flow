import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import type { AppConfig } from "../../src/config.js";
import { baseDatabaseUrl } from "./helpers/db.js";

const config: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl: "postgresql://app:app@localhost:5433/app",
  clientOrigins: ["http://localhost:5173"],
};

const realPrisma = new PrismaClient({ datasources: { db: { url: baseDatabaseUrl() } } });
afterAll(() => realPrisma.$disconnect());

describe("health and readiness (F-05 §2.2)", () => {
  it("TEST-F05-08 / AC-F05-08: GET /api/health answers 200 ok, with no cookie", async () => {
    const res = await request(createApp({ prisma: realPrisma, config })).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("TEST-F05-09 / AC-F05-09: GET /api/ready answers 200 ready when the database is reachable", async () => {
    const res = await request(createApp({ prisma: realPrisma, config })).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("TEST-F05-10 / AC-F05-10: GET /api/ready answers 503 not_ready, with no error detail, when the database fails", async () => {
    const failing = {
      $queryRaw: () => Promise.reject(new Error("SECRET-DETAIL connect ECONNREFUSED 10.0.0.1:5432")),
    } as unknown as PrismaClient;
    const res = await request(createApp({ prisma: failing, config })).get("/api/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "not_ready" });
    expect(res.text).not.toContain("SECRET-DETAIL");
    expect(res.text).not.toContain("ECONNREFUSED");
  });
});
