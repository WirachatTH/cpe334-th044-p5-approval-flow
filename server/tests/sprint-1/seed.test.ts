import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "../../src/password.js";
import { createThrowawaySchema, migrate, seed, type ThrowawaySchema } from "./helpers/db.js";
import type { RunResult } from "./helpers/run.js";

// F-05 §1.2 step 2 and §2.3. Every test runs the real commands (`prisma migrate deploy`, then the seed as a
// separate process) against a throwaway schema. The passwords are synthetic values made up for these tests.

const PASSWORD_A = "Synthetic-Pass-A1";
const PASSWORD_B = "Synthetic-Pass-B2";

const DEMO_ACCOUNTS = [
  { name: "Korn Thanakit", email: "korn.reviewer@example.com", role: "REVIEWER" },
  { name: "Mint Chaiyaporn", email: "mint.reviewer@example.com", role: "REVIEWER" },
  { name: "Nattapong Kaewdee", email: "nattapong.requester@example.com", role: "REQUESTER" },
  { name: "Ploy Srisawat", email: "ploy.requester@example.com", role: "REQUESTER" },
] as const; // sorted by email, to match findMany({ orderBy: { email: "asc" } })

const SEED_SUMMARY = (created: number, updated: number, unchanged: number) =>
  `seed: 4 accounts (${created} created, ${updated} updated, ${unchanged} unchanged)`;

let seeded: ThrowawaySchema; // used by the tests that follow one another: 01, 02, 07, 19, 03, 06
let empty: ThrowawaySchema; // migrated, never seeded: 04, 05
const outputs: RunResult[] = []; // every successful seed run, for TEST-F05-06

beforeAll(async () => {
  seeded = await createThrowawaySchema();
  empty = await createThrowawaySchema();
  const migrated = await migrate(empty.url);
  expect(migrated.code, migrated.stderr).toBe(0);
});

afterAll(async () => {
  await seeded?.drop();
  await empty?.drop();
});

describe("the demo-account seed", () => {
  it("TEST-F05-01 / AC-F05-01: migrate deploy then seed create the four demo accounts", async () => {
    const migrated = await migrate(seeded.url);
    expect(migrated.code, migrated.stderr).toBe(0);

    const result = await seed({ DATABASE_URL: seeded.url, DEMO_USER_PASSWORD: PASSWORD_A });
    outputs.push(result);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(SEED_SUMMARY(4, 0, 0));

    const users = await seeded.prisma.user.findMany({ orderBy: { email: "asc" } });
    expect(users.map(({ name, email, role }) => ({ name, email, role }))).toEqual(DEMO_ACCOUNTS);
    expect(users.every((user) => user.isActive)).toBe(true);
  });

  it("TEST-F05-02 / AC-F05-02: running the seed again changes nothing", async () => {
    const before = await seeded.prisma.user.findMany({ orderBy: { email: "asc" } });

    const result = await seed({ DATABASE_URL: seeded.url, DEMO_USER_PASSWORD: PASSWORD_A });
    outputs.push(result);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(SEED_SUMMARY(0, 0, 4));

    const after = await seeded.prisma.user.findMany({ orderBy: { email: "asc" } });
    expect(after).toHaveLength(4);
    expect(after.map((u) => [u.email, u.passwordHash, u.updatedAt.getTime()])).toEqual(
      before.map((u) => [u.email, u.passwordHash, u.updatedAt.getTime()]),
    );
  });

  it("TEST-F05-07 / AC-F05-07: every stored password_hash is an scrypt hash, not the password", async () => {
    const users = await seeded.prisma.user.findMany();
    expect(users).toHaveLength(4);
    for (const user of users) {
      expect(user.passwordHash).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
      expect(user.passwordHash).not.toBe(PASSWORD_A);
    }
  });

  it("TEST-F05-19 / AC-F05-19: a changed name and role are restored by one update", async () => {
    const ploy = await seeded.prisma.user.findUnique({ where: { email: "ploy.requester@example.com" } });
    expect(ploy, "the seed must have created Ploy (TEST-F05-01)").not.toBeNull();
    await seeded.prisma.user.update({
      where: { email: "ploy.requester@example.com" },
      data: { name: "Changed", role: "REVIEWER" },
    });
    const before = await seeded.prisma.user.findMany({ orderBy: { email: "asc" } });

    const result = await seed({ DATABASE_URL: seeded.url, DEMO_USER_PASSWORD: PASSWORD_A });
    outputs.push(result);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(SEED_SUMMARY(0, 1, 3));

    const after = await seeded.prisma.user.findMany({ orderBy: { email: "asc" } });
    const [ployBefore, ployAfter] = [before, after].map((rows) => rows.find((u) => u.email.startsWith("ploy"))!);
    expect({ name: ployAfter.name, role: ployAfter.role }).toEqual({ name: "Ploy Srisawat", role: "REQUESTER" });
    expect(ployAfter.passwordHash).toBe(ployBefore.passwordHash);
    expect(ployAfter.updatedAt.getTime()).toBeGreaterThan(ployBefore.updatedAt.getTime());
    for (const user of after.filter((u) => !u.email.startsWith("ploy"))) {
      const earlier = before.find((u) => u.email === user.email)!;
      expect(user.updatedAt.getTime(), `${user.email} must not be updated`).toBe(earlier.updatedAt.getTime());
    }
  });

  it("TEST-F05-03 / AC-F05-03: a new DEMO_USER_PASSWORD replaces every hash", async () => {
    const result = await seed({ DATABASE_URL: seeded.url, DEMO_USER_PASSWORD: PASSWORD_B });
    outputs.push(result);
    expect(result.code, result.stderr).toBe(0);

    const users = await seeded.prisma.user.findMany();
    expect(users).toHaveLength(4);
    for (const user of users) {
      expect(await verifyPassword(PASSWORD_B, user.passwordHash), `${user.email} accepts the new password`).toBe(true);
      expect(await verifyPassword(PASSWORD_A, user.passwordHash), `${user.email} rejects the old password`).toBe(false);
    }
  });

  it("TEST-F05-06 / AC-F05-06: no seed run prints the password or a hash", () => {
    expect(outputs.length).toBeGreaterThanOrEqual(4);
    for (const { stdout, stderr } of outputs) {
      for (const text of [stdout, stderr]) {
        expect(text).not.toContain(PASSWORD_A);
        expect(text).not.toContain(PASSWORD_B);
        expect(text).not.toContain("scrypt$");
      }
    }
  });

  it("TEST-F05-04 / AC-F05-04: without DEMO_USER_PASSWORD the seed exits 1 and creates nothing", async () => {
    const result = await seed({ DATABASE_URL: empty.url });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DEMO_USER_PASSWORD is not set");
    expect(await empty.prisma.user.count()).toBe(0);
  });

  it.each([
    ["9 characters", "Short1abc"],
    ["no digit", "NoDigitsHere-abc"],
  ])("TEST-F05-05 / AC-F05-05: a password with %s is refused without being printed", async (_label, password) => {
    const result = await seed({ DATABASE_URL: empty.url, DEMO_USER_PASSWORD: password });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DEMO_USER_PASSWORD does not meet the password rules");
    expect(result.stderr).toContain("10-128 characters");
    expect(result.stderr).not.toContain(password);
    expect(result.stdout).not.toContain(password);
    expect(await empty.prisma.user.count()).toBe(0);
  });

  it("TEST-F05-20 / AC-F05-20: without DATABASE_URL the seed exits 1 within 5 s", async () => {
    const result = await seed({ DEMO_USER_PASSWORD: PASSWORD_A }, 5_000);
    expect(result.timedOut, "the seed must exit by itself within 5 s").toBe(false);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("seed: DATABASE_URL is not set");
  });
});
