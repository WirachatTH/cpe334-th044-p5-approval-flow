import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { registerAuthRoutes } from "./auth.js";
import { authorize, rejectForeignOrigin } from "./authorization.js";
import type { AppConfig } from "./config.js";
import { errorHandler, notFound } from "./errors.js";
import { LoginThrottle } from "./loginThrottle.js";

// The application factory. It receives its dependencies so that tests can pass their own Prisma client and
// configuration (F-05 §1.7). index.ts is the only server-runtime file that creates the real client.
export interface AppDeps {
  prisma: PrismaClient;
  config: AppConfig;
  // The sign-in throttle. Each app gets its own unless a test passes one in, so the tests can reset it.
  throttle?: LoginThrottle;
}

export function createApp({ prisma, config, throttle = new LoginThrottle() }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("case sensitive routing", true);
  app.set("strict routing", true);

  // F-02 §1.2, in this order. The JSON body is read only after authorization, so a caller who may not use a route
  // learns nothing by sending one.
  app.use(rejectForeignOrigin(config.clientOrigins));
  app.use(authorize(prisma));
  app.use(express.json({ limit: "100kb" }));

  // Liveness: answers without touching the database (F-05 AC-F05-08). Public routes never look up a session.
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

  registerAuthRoutes(app, { prisma, config, throttle });
  // F-03 and F-04 register their routes here; each one needs a policy in ROUTE_POLICIES first.

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
