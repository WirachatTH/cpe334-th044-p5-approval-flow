import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createThrowawaySchema, migrate, seed, type ThrowawaySchema } from "../sprint-1/helpers/db.js";

// TEST-F07-16 / AC-F07-16: the seed gives three reviewers, so that a reviewer's own high request has a second approver.

const PASSWORD = "Synthetic-Pass-A1";
let schema: ThrowawaySchema;

beforeAll(async () => {
  schema = await createThrowawaySchema();
});
afterAll(async () => {
  await schema?.drop();
});

describe("the seeded reviewers", () => {
  it("TEST-F07-16 / AC-F07-16: five accounts, three of them reviewers, and a rerun changes nothing", async () => {
    const migrated = await migrate(schema.url);
    expect(migrated.code, migrated.stderr).toBe(0);
    const first = await seed({ DATABASE_URL: schema.url, DEMO_USER_PASSWORD: PASSWORD });
    expect(first.code, first.stderr).toBe(0);
    expect(first.stdout).toContain("seed: 5 accounts (5 created, 0 updated, 0 unchanged)");

    const reviewers = await schema.prisma.user.findMany({ where: { role: "REVIEWER" }, orderBy: { email: "asc" } });
    expect(reviewers.map((u) => u.email)).toEqual([
      "anan.reviewer@example.com",
      "korn.reviewer@example.com",
      "mint.reviewer@example.com",
    ]);
    expect(await schema.prisma.user.count()).toBe(5);

    const again = await seed({ DATABASE_URL: schema.url, DEMO_USER_PASSWORD: PASSWORD });
    expect(again.stdout).toContain("seed: 5 accounts (0 created, 0 updated, 5 unchanged)");
  });
});
