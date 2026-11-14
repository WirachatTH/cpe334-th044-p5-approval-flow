import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import type { AuthLocals } from "./authorization.js";
import type { AppConfig } from "./config.js";
import { sendError } from "./errors.js";
import type { AttemptOutcome, LoginThrottle } from "./loginThrottle.js";
import { verifyPasswordForLogin } from "./password.js";
import {
  SESSION_COOKIE,
  createSession,
  deleteExpiredSessions,
  deleteSessionByToken,
  readCookie,
  sessionCookieOptions,
  toSessionUser,
} from "./session.js";

// Sign-in, current user, and sign-out (F-01 contract). The routes are registered directly on the app, so
// TEST-F02-06 can compare every registered route with ROUTE_POLICIES.

const EMAIL_MAX = 254;
const PASSWORD_MAX = 128;

type Parsed = { ok: true; email: string; password: string } | { ok: false; fields?: Record<string, string> };

// F-01 §1.4. Every problem is reported at once; the email is trimmed and lowercased, the password is not trimmed.
function parseLogin(body: unknown): Parsed {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false };
  const { email, password } = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const trimmed = typeof email === "string" ? email.trim() : "";
  if (trimmed === "") fields.email = "Enter your email address.";
  else if (trimmed.length > EMAIL_MAX) fields.email = "Email address is too long.";

  if (typeof password !== "string" || password === "") fields.password = "Enter your password.";
  else if ([...password].length > PASSWORD_MAX) fields.password = "Password is too long.";

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, email: trimmed.toLowerCase(), password: password as string };
}

export function registerAuthRoutes(
  app: Express,
  { prisma, config, throttle }: { prisma: PrismaClient; config: AppConfig; throttle: LoginThrottle },
): void {
  app.post("/api/auth/login", async (req, res, next) => {
    const parsed = parseLogin(req.body);
    // A validation error is answered before the throttle, so it is never counted as a failed sign-in.
    if (!parsed.ok) return sendError(res, 400, "VALIDATION_ERROR", "Some fields need attention.", parsed.fields);
    const { email, password } = parsed;

    // Reserved before the password is checked, so a burst of simultaneous guesses cannot get past the limit.
    const start = throttle.beginAttempt(email, Date.now());
    if (!start.allowed) {
      res.set("Retry-After", String(start.retryAfterSeconds));
      return sendError(res, 429, "TOO_MANY_ATTEMPTS", "Too many sign-in attempts. Please try again later.");
    }

    // A failure counts; a database error and an inactive account do not.
    let outcome: AttemptOutcome = "neutral";
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      // An unknown email still runs one full scrypt verification, so the response time reveals nothing.
      const valid = await verifyPasswordForLogin(password, user?.passwordHash ?? null);
      if (!user || !valid) {
        outcome = "failure";
        return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }
      if (!user.isActive) return sendError(res, 403, "ACCOUNT_INACTIVE", "This account is inactive.");

      outcome = "success";
      await deleteExpiredSessions(prisma, user.id);
      const { token } = await createSession(prisma, user.id);
      res.cookie(SESSION_COOKIE, token, sessionCookieOptions(config.nodeEnv));
      res.json({ user: toSessionUser(user) });
    } catch (error) {
      outcome = "neutral";
      next(error);
    } finally {
      throttle.endAttempt(email, outcome, Date.now());
    }
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      const token = readCookie(req.headers.cookie, SESSION_COOKIE);
      if (token) await deleteSessionByToken(prisma, token);
      // Always clear the cookie and answer 204, with or without a session.
      res.cookie(SESSION_COOKIE, "", { ...sessionCookieOptions(config.nodeEnv), maxAge: 0 });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", (_req, res) => {
    // authorize has already required a session for this route.
    const { auth } = res.locals as AuthLocals;
    res.json({ user: auth!.user });
  });
}
