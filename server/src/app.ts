import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "./config.js";

// The application factory. It receives its dependencies so that tests can pass their own Prisma client and
// configuration (F-05 §1.7). index.ts is the only server-runtime file that creates the real client.
export interface AppDeps {
  prisma: PrismaClient;
  config: AppConfig;
}

// SCAFFOLD STUB (#8, chore commit): an Express app with no routes yet. F-05 adds /api/health and /api/ready;
// F-01 and F-02 add authentication and the route-policy table.
export function createApp(_deps: AppDeps): Express {
  const app = express();
  return app;
}
