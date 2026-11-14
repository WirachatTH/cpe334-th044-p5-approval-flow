import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "./config.js";

// The application factory. It receives its dependencies so that tests can pass their own Prisma client and
// configuration (F-05 §1.7). index.ts is the only server-runtime file that creates the real client.
export interface AppDeps {
  prisma: PrismaClient;
  config: AppConfig;
}

export function createApp({ prisma }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");

  // Liveness: answers without touching the database (F-05 AC-F05-08).
  app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ status: "ok" });
  });

  // Readiness: can the service reach its database? Failure details are never sent to the caller (AC-F05-10).
  app.get("/api/ready", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", db: "connected" });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  // F-01 and F-02 add the origin guard, the route-policy table, sessions, and the error handler.
  return app;
}
