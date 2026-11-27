import type { Response } from "express";
import type { PrismaClient, RequestStatus } from "@prisma/client";
import { sendError } from "./errors.js";

// What the operations on an existing request share (F-04 and F-06 contracts, sections 1.2 and 1.4).

const MAX_INT4 = 2_147_483_647;

export const DECIDED_MESSAGE = "This request has already been decided.";
export const RETURNED_MESSAGE = "This request was returned to the requester for changes.";
const STALE_MESSAGE = "This request was changed after you opened it. Check it again.";
export const REVISION_INVALID = "Reload the request and try again.";

export async function findRequest(prisma: PrismaClient, param: string) {
  const id = /^[1-9]\d*$/.test(param) ? Number(param) : NaN;
  if (!Number.isSafeInteger(id) || id > MAX_INT4) return null;
  return prisma.approvalRequest.findUnique({
    where: { id },
    select: { id: true, requesterId: true, assignedReviewerId: true, status: true, revision: true },
  });
}

// The revision a reviewer's action names: absent and null count as missing (F-06 section 1.4).
export function readRevision(value: unknown): { ok: true; revision: number | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, revision: null };
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return { ok: true, revision: value };
  return { ok: false };
}

// A resubmitted request must be named by its current revision; a revision that is given must always match.
export const isStale = (given: number | null, current: number) => (given === null ? current > 0 : given !== current);

// Why a reviewer cannot act on a request in this status.
export function refuseStatus(res: Response, status: RequestStatus) {
  return sendError(res, 409, "INVALID_TRANSITION", status === "RETURNED" ? RETURNED_MESSAGE : DECIDED_MESSAGE);
}

export function refuseStale(res: Response) {
  return sendError(res, 409, "STALE_REVISION", STALE_MESSAGE);
}

// A reviewer's write that changed no row (BR-14): the request is read again to say why.
export async function refuseLostWrite(res: Response, prisma: PrismaClient, id: number) {
  const now = await prisma.approvalRequest.findUniqueOrThrow({ where: { id }, select: { status: true } });
  return now.status === "SUBMITTED" ? refuseStale(res) : refuseStatus(res, now.status);
}
