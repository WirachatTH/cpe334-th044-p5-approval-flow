import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PRISMA_CLI, childEnv, run, type RunResult } from "./run.js";

// A throwaway PostgreSQL schema inside the development database (F-05 STS): created for a test file, migrated and
// seeded through the real commands, and dropped afterwards. The permanent data in schema "public" is never touched.

export function baseDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set to run the database tests (copy server/.env.example to server/.env).");
  return url;
}

export function urlForSchema(base: string, schema: string): string {
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  return url.toString();
}

export interface ThrowawaySchema {
  schema: string;
  url: string;
  prisma: PrismaClient;
  drop: () => Promise<void>;
}

export async function createThrowawaySchema(): Promise<ThrowawaySchema> {
  const admin = new PrismaClient({ datasources: { db: { url: baseDatabaseUrl() } } });
  const schema = `f05_${randomBytes(6).toString("hex")}`;
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = urlForSchema(baseDatabaseUrl(), schema);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return {
    schema,
    url,
    prisma,
    async drop() {
      await prisma.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.$disconnect();
    },
  };
}

// `prisma migrate deploy`, as CI and the Cloud Run job run it.
export function migrate(url: string): Promise<RunResult> {
  return run([PRISMA_CLI, "migrate", "deploy"], childEnv({ DATABASE_URL: url }), 60_000);
}

// `node --import tsx prisma/seed.ts`, with exactly the environment given (no DATABASE_URL or password unless
// the test passes one).
export function seed(env: Record<string, string | undefined>, timeoutMs = 30_000): Promise<RunResult> {
  return run(["--import", "tsx", "prisma/seed.ts"], childEnv({ NODE_ENV: "test", ...env }), timeoutMs);
}
