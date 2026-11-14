import { PrismaClient } from "@prisma/client";

// Lazy singleton for the server runtime (index.ts) and the seed: the client is created on first use, not at
// import time. Tests do not use this; they pass their own client to createApp (F-05 §1.7).
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) client = new PrismaClient();
  return client;
}
