import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions } from "express";
import type { PrismaClient, Role } from "@prisma/client";
import type { NodeEnv } from "./config.js";

// Server-side sessions (SDS §7, F-01 contract), adapted from the team's Labs 1-4 scaffold (Lab 3 code).
//
// The browser holds an opaque random token; the database holds only its SHA-256. Nothing is signed, so there is no
// server secret to configure, leak, or commit: a token is valid only while its hash is in the session table, and
// deleting the row is what signing out means.

export const SESSION_COOKIE = "af_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // NFR-04
const TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

// SHA-256, not a slow hash: the token is 256 bits of randomness, not a guessable password.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// HttpOnly, so client JavaScript can never read it; SameSite=Strict, so the browser never sends it on a request
// started from another site; scoped to /api; Secure in production (plain HTTP is only used locally).
export function sessionCookieOptions(nodeEnv: NodeEnv): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    path: "/api",
    maxAge: SESSION_TTL_MS,
    secure: nodeEnv === "production",
  };
}

// The user shape every auth response carries. Never the hash.
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export function toSessionUser(user: SessionUser): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export interface ActiveSession {
  sessionId: number;
  user: SessionUser;
}

// The value of one cookie from a Cookie header, or undefined.
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export async function createSession(prisma: PrismaClient, userId: number): Promise<{ token: string }> {
  const token = generateSessionToken();
  await prisma.session.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return { token };
}

// The session behind a cookie value, or null when there is none to honour: an unknown token, an expired one (deleted
// on sight), or one whose user is no longer active. A database error is not swallowed: it propagates, so a broken
// database never looks like "signed out" (F-02 contract §1.5).
export async function findSession(prisma: PrismaClient, token: string): Promise<ActiveSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (!session.user.isActive) return null;
  return { sessionId: session.id, user: toSessionUser(session.user) };
}

export async function deleteSessionByToken(prisma: PrismaClient, token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

// A successful sign-in sweeps that user's expired rows.
export async function deleteExpiredSessions(prisma: PrismaClient, userId: number): Promise<void> {
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
}
