import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { ROUTE_POLICIES } from "../../src/authorization.js";
import type { AppConfig } from "../../src/config.js";

// TEST-F02-06 / AC-F02-06: a handler added without a policy is caught here, not in production.

const config: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl: "postgresql://app:app@localhost:5433/app",
  clientOrigins: ["http://localhost:5173"],
};

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
}

// Routes are registered directly on the app (not on sub-routers), so the router stack lists each one.
function registeredRoutes(app: Express): string[] {
  const stack = (app as unknown as { _router: { stack: Layer[] } })._router.stack;
  return stack
    .filter((layer): layer is Required<Layer> => layer.route !== undefined)
    .flatMap(({ route }) => Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${route.path}`));
}

describe("route policies", () => {
  it("TEST-F02-06 / AC-F02-06: every registered route has exactly one policy", () => {
    const app = createApp({ prisma: {} as unknown as PrismaClient, config });
    const routes = registeredRoutes(app);
    expect(routes.length, "the app registers its routes on the app itself").toBeGreaterThanOrEqual(5);

    const policies = ROUTE_POLICIES.map((p) => `${p.method} ${p.path}`);
    for (const route of routes) {
      expect(policies.filter((p) => p === route), `policies for ${route}`).toHaveLength(1);
    }
    expect(new Set(policies).size, "no duplicate policy entries").toBe(policies.length);
  });
});
