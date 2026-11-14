import type { RequestHandler } from "express";
import type { PrismaClient, Role } from "@prisma/client";
import { sendError } from "./errors.js";
import { SESSION_COOKIE, findSession, readCookie, type ActiveSession } from "./session.js";

// The single authorization point (F-02 contract §1.2 and §1.6; SDS §5 and §6), adapted from the team's Labs 1-4
// scaffold (Lab 3 code). Every route the API answers is listed in ROUTE_POLICIES, and one middleware applies the
// list before any handler runs, in this order:
//
//   1. cross-origin guard (POST)    -> 403 FORBIDDEN_ORIGIN   (rejectForeignOrigin)
//   2. policy lookup                -> 404 NOT_FOUND          (a method and path with no policy)
//   3. session, roles/optional only -> 401 UNAUTHENTICATED
//   4. role                         -> 403 FORBIDDEN
//
// A request that matches no policy never reaches a handler, so a handler added without a policy is unreachable
// rather than unguarded (TEST-F02-06 fails until it is classified). Hiding a control in the client is feedback for a
// person, never this boundary.

export type Access =
  | { kind: "public" } // no session is looked up
  | { kind: "optional" } // the session is used when there is one
  | { kind: "roles"; roles: readonly Role[] }; // a session with one of these roles is required

export interface RoutePolicy {
  method: "GET" | "POST";
  path: string;
  access: Access;
}

const PUBLIC: Access = { kind: "public" };
const roles = (...list: Role[]): Access => ({ kind: "roles", roles: list });
const R: Role = "REQUESTER";
const V: Role = "REVIEWER";

// F-02 contract §1.6, row for row. The F-03 and F-04 routes are guarded already: their handlers arrive later, and
// until then an allowed role gets 404 while a wrong role gets 403 and no session gets 401. A literal segment must
// come before a parameter that would also match it (mine before :id).
export const ROUTE_POLICIES: readonly RoutePolicy[] = [
  { method: "GET", path: "/api/health", access: PUBLIC },
  { method: "GET", path: "/api/ready", access: PUBLIC },
  { method: "POST", path: "/api/auth/login", access: PUBLIC },
  { method: "POST", path: "/api/auth/logout", access: { kind: "optional" } },
  { method: "GET", path: "/api/auth/me", access: roles(R, V) },
  { method: "GET", path: "/api/reviewers", access: roles(R, V) },
  { method: "POST", path: "/api/requests", access: roles(R, V) },
  { method: "GET", path: "/api/requests/mine", access: roles(R, V) },
  { method: "GET", path: "/api/requests/:id", access: roles(R, V) },
  { method: "GET", path: "/api/reviews/inbox", access: roles(V) },
  { method: "POST", path: "/api/requests/:id/decision", access: roles(V) },
];

// Matching is exact: case-sensitive, no trailing slash, no repeated slash. A `:name` segment matches any one
// non-empty segment.
const MATCHERS = ROUTE_POLICIES.map((policy) => ({
  policy,
  pattern: new RegExp(
    `^${policy.path
      .split("/")
      .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      .join("/")}$`,
  ),
}));

export function findPolicy(method: string, path: string): RoutePolicy | undefined {
  return MATCHERS.find((m) => m.policy.method === method && m.pattern.test(path))?.policy;
}

// What authorize leaves for the handlers: the session, when there is one.
export interface AuthLocals {
  auth: ActiveSession | null;
}

// A state-changing request from another site is refused before anything else (the cookie's SameSite=Strict is the
// first defence; this is the second). An absent Origin header passes: server-to-server tools, Supertest, and the
// smoke test send none, and browsers always send one on a POST. Origin "null" (sandboxed frames) is refused.
export function rejectForeignOrigin(allowed: readonly string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (req.method === "POST" && origin !== undefined && !allowed.includes(origin)) {
      return sendError(res, 403, "FORBIDDEN_ORIGIN", "This request came from a site that is not allowed.");
    }
    next();
  };
}

export function authorize(prisma: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    try {
      const policy = findPolicy(req.method, req.path);
      if (!policy) return sendError(res, 404, "NOT_FOUND", "Not found.");

      const locals = res.locals as AuthLocals;
      locals.auth = null;
      if (policy.access.kind !== "public") {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        locals.auth = token ? await findSession(prisma, token) : null;
      }

      if (policy.access.kind === "roles") {
        if (!locals.auth) return sendError(res, 401, "UNAUTHENTICATED", "Please sign in.");
        if (!policy.access.roles.includes(locals.auth.user.role)) {
          return sendError(res, 403, "FORBIDDEN", "You do not have permission to do this.");
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
