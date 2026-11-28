import { expect } from "vitest";
import { randomBytes } from "node:crypto";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../../../src/app.js";
import type { AppConfig } from "../../../src/config.js";
import { LoginThrottle } from "../../../src/loginThrottle.js";
import { hashPassword } from "../../../src/password.js";
import { createThrowawaySchema, migrate, seed, type ThrowawaySchema } from "./db.js";

// A real app (createApp) on a throwaway, migrated, and seeded PostgreSQL schema, for the API tests of F-01 and F-02.
// The password is a synthetic value made up for the tests.

export const PASSWORD = "Synthetic-Pass-A1";
export const ORIGIN = "http://localhost:5173";

export const ACCOUNTS = {
  ploy: "ploy.requester@example.com",
  nattapong: "nattapong.requester@example.com",
  mint: "mint.reviewer@example.com",
  korn: "korn.reviewer@example.com",
} as const;

export interface TestApp {
  app: Express;
  prisma: PrismaClient;
  throttle: LoginThrottle;
  config: AppConfig;
  drop: () => Promise<void>;
}

export async function startTestApp(): Promise<TestApp> {
  const schema: ThrowawaySchema = await createThrowawaySchema();
  const migrated = await migrate(schema.url);
  expect(migrated.code, migrated.stderr).toBe(0);
  const seeded = await seed({ DATABASE_URL: schema.url, DEMO_USER_PASSWORD: PASSWORD });
  expect(seeded.code, seeded.stderr).toBe(0);

  const config: AppConfig = { nodeEnv: "test", port: 3000, databaseUrl: schema.url, clientOrigins: [ORIGIN] };
  const throttle = new LoginThrottle();
  return {
    app: createApp({ prisma: schema.prisma, config, throttle }),
    prisma: schema.prisma,
    throttle,
    config,
    drop: () => schema.drop(),
  };
}

// An agent that keeps its cookies, already signed in.
export async function signedIn(t: TestApp, email: string) {
  t.throttle.clear();
  const agent = request.agent(t.app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  expect(res.status, `signing in as ${email}: ${res.text}`).toBe(200);
  return agent;
}

export function setCookies(res: { headers: Record<string, unknown> }): string[] {
  const header = res.headers["set-cookie"];
  return Array.isArray(header) ? (header as string[]) : [];
}

// The af_session value from a sign-in response.
export function tokenOf(res: { headers: Record<string, unknown> }): string {
  const cookie = setCookies(res).find((c) => c.startsWith("af_session="));
  expect(cookie, "the response sets an af_session cookie").toBeDefined();
  return cookie!.split(";")[0].slice("af_session=".length);
}

// The ids of the four seeded accounts that Sprint 1 uses; the seed also creates a third reviewer (F-07).
export async function userIds(t: TestApp) {
  const users = await t.prisma.user.findMany({ where: { email: { in: Object.values(ACCOUNTS) } } });
  const id = (email: string) => users.find((u) => u.email === email)!.id;
  return { ploy: id(ACCOUNTS.ploy), nattapong: id(ACCOUNTS.nattapong), mint: id(ACCOUNTS.mint), korn: id(ACCOUNTS.korn) };
}

// A new account that can sign in with PASSWORD, so a test does not depend on requests that other tests made for
// the seeded accounts.
export async function freshUser(t: TestApp, role: "REQUESTER" | "REVIEWER", label: string) {
  const email = `${label}.${randomBytes(4).toString("hex")}@example.com`;
  return t.prisma.user.create({
    data: { name: `Test ${label}`, email, role, passwordHash: await hashPassword(PASSWORD) },
  });
}
