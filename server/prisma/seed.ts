import { PrismaClient, Role } from "@prisma/client";
import { hashPassword, passwordRuleError, verifyPassword } from "../src/password.js";

// Demo-account seed (F-05 contract §1.2 step 2 and §2.3).
//
// It is idempotent. It reads each demo account by email, creates it when missing, and otherwise issues one UPDATE
// only for the fields that differ. It never uses upsert: an update, even with identical values, would change
// Prisma's @updatedAt, and a rerun must change nothing. The password hash is rewritten only when it no longer
// verifies against DEMO_USER_PASSWORD, so a rotated password takes effect on the next run.
//
// The seed reads DATABASE_URL and DEMO_USER_PASSWORD itself, as a separate command from the server. It never prints
// the password or a hash.

const DEMO_ACCOUNTS = [
  { name: "Ploy Srisawat", email: "ploy.requester@example.com", role: Role.REQUESTER },
  { name: "Nattapong Kaewdee", email: "nattapong.requester@example.com", role: Role.REQUESTER },
  { name: "Mint Chaiyaporn", email: "mint.reviewer@example.com", role: Role.REVIEWER },
  { name: "Korn Thanakit", email: "korn.reviewer@example.com", role: Role.REVIEWER },
  // A third reviewer, so that a reviewer's own request above the threshold has a second approver (BR-17).
  { name: "Anan Wongsawat", email: "anan.reviewer@example.com", role: Role.REVIEWER },
] as const;

function fail(lines: string[]): void {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  // Check the environment before any connection attempt, and report every problem at once.
  const problems: string[] = [];
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (databaseUrl === "") problems.push("seed: DATABASE_URL is not set");

  const password = process.env.DEMO_USER_PASSWORD ?? "";
  if (password === "") {
    problems.push("seed: DEMO_USER_PASSWORD is not set");
  } else if (passwordRuleError(password, "") !== null) {
    problems.push("seed: DEMO_USER_PASSWORD does not meet the password rules (10-128 characters, a letter and a digit)");
  }
  if (problems.length > 0) return fail(problems);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const counts = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      for (const account of DEMO_ACCOUNTS) {
        const existing = await tx.user.findUnique({ where: { email: account.email } });
        if (!existing) {
          await tx.user.create({
            data: { ...account, isActive: true, passwordHash: await hashPassword(password) },
          });
          created += 1;
          continue;
        }
        const changes: { name?: string; role?: Role; passwordHash?: string } = {};
        if (existing.name !== account.name) changes.name = account.name;
        if (existing.role !== account.role) changes.role = account.role;
        if (!(await verifyPassword(password, existing.passwordHash))) changes.passwordHash = await hashPassword(password);
        if (Object.keys(changes).length === 0) {
          unchanged += 1;
        } else {
          await tx.user.update({ where: { id: existing.id }, data: changes });
          updated += 1;
        }
      }
      return { created, updated, unchanged };
    }, { timeout: 30_000, maxWait: 10_000 }); // scrypt runs inside the transaction; Prisma's default is 5 s
    console.log(
      `seed: ${DEMO_ACCOUNTS.length} accounts (${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Name and code only: a database error message can carry connection details.
  const name = error instanceof Error ? error.name : "unknown error";
  const code = typeof error === "object" && error !== null && "code" in error ? ` ${String(error.code)}` : "";
  fail([`seed: failed (${name}${code})`]);
});
