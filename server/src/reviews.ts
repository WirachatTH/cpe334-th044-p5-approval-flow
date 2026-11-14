import type { Express } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthLocals } from "./authorization.js";
import { sendError } from "./errors.js";
import { detailInclude, toDetail } from "./requests.js";

// The review inbox and the decision (F-04 contract). The caller is always the signed-in user. The rules are checked
// in the order of contract section 1.2, and the first one that fails answers.

const REASON_MAX = 1000;
const MAX_INT4 = 2_147_483_647;

const CHOOSE_DECISION = "Choose approve or reject.";
const REASON_REQUIRED = "Enter a reason to reject this request.";
const REASON_TEXT = "Enter the reason as text.";
const REASON_TOO_LONG = "Reason must be 1,000 characters or fewer.";
const ALREADY_DECIDED = "This request has already been decided.";

interface Decision {
  decision: "APPROVE" | "REJECT";
  reason: string | null;
}

// F-04 section 1.4. Every problem is reported at once; the reason is stored trimmed.
function parseDecision(body: unknown): { ok: true; value: Decision } | { ok: false; fields: Record<string, string> } {
  const input = (typeof body === "object" && body !== null && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const decision = input.decision;
  if (decision !== "APPROVE" && decision !== "REJECT") fields.decision = CHOOSE_DECISION;

  // A reason is optional for an approval and required for a rejection. Missing, null, or only spaces counts as blank.
  let reason: string | null = null;
  if (input.reason !== undefined && input.reason !== null && typeof input.reason !== "string") {
    fields.reason = REASON_TEXT;
  } else {
    const trimmed = typeof input.reason === "string" ? input.reason.trim() : "";
    if (trimmed !== "") reason = trimmed;
    if (reason === null && decision === "REJECT") fields.reason = REASON_REQUIRED;
    else if (reason !== null && [...reason].length > REASON_MAX) fields.reason = REASON_TOO_LONG;
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { decision: decision as Decision["decision"], reason } };
}

const person = { select: { id: true, name: true } } as const;

export function registerReviewRoutes(app: Express, { prisma }: { prisma: PrismaClient }): void {
  const me = (locals: unknown) => (locals as AuthLocals).auth!.user;

  // The SUBMITTED requests assigned to the caller, oldest first (F-04 section 1.2). A request the caller submitted is
  // never here: the database does not let a requester also be the assigned reviewer.
  app.get("/api/reviews/inbox", async (_req, res, next) => {
    try {
      const rows = await prisma.approvalRequest.findMany({
        where: { assignedReviewerId: me(res.locals).id, status: "SUBMITTED" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { requester: person },
      });
      res.json({
        requests: rows.map((row) => ({
          id: row.id,
          requestNumber: row.requestNumber,
          title: row.title,
          amount: row.amount.toFixed(2),
          requester: row.requester,
          createdAt: row.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/requests/:id/decision", async (req, res, next) => {
    try {
      const user = me(res.locals);

      // Step 2: a missing id, an id that is not a number, and an id that does not exist are the same 404.
      const id = /^[1-9]\d*$/.test(req.params.id) ? Number(req.params.id) : NaN;
      const found =
        Number.isSafeInteger(id) && id <= MAX_INT4
          ? await prisma.approvalRequest.findUnique({
              where: { id },
              select: { requesterId: true, assignedReviewerId: true, status: true },
            })
          : null;
      if (!found) return sendError(res, 404, "NOT_FOUND", "Not found.");

      // Step 3 (BR-10), before record scope, so a reviewer who submitted the request is told why.
      if (found.requesterId === user.id) {
        return sendError(res, 403, "SELF_APPROVAL_FORBIDDEN", "You cannot decide a request you submitted.");
      }
      // Step 4 (BR-09, BR-08): anyone else who is not the assigned reviewer gets the same 404 as a missing id.
      if (found.assignedReviewerId !== user.id) return sendError(res, 404, "NOT_FOUND", "Not found.");

      // Step 5.
      const parsed = parseDecision(req.body);
      if (!parsed.ok) return sendError(res, 400, "VALIDATION_ERROR", "Some fields need attention.", parsed.fields);

      // Step 6 (BR-11).
      if (found.status !== "SUBMITTED") return sendError(res, 409, "INVALID_TRANSITION", ALREADY_DECIDED);

      // Step 7 (BR-13, BR-14). The UPDATE matches only while the request is still SUBMITTED and assigned to the
      // caller, so of two simultaneous decisions only one changes a row. The other changes none, and nothing is
      // written for it. The database clock sets the time, in the same statement that changes the status.
      const { decision, reason } = parsed.value;
      const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      const decided = await prisma.$transaction(async (tx) => {
        const changed = await tx.$executeRaw(Prisma.sql`
          UPDATE request
             SET status = CAST(${status} AS "RequestStatus"),
                 decided_by_id = ${user.id},
                 decided_at = now(),
                 decision_reason = ${reason},
                 updated_at = now()
           WHERE id = ${id} AND status = 'SUBMITTED' AND assigned_reviewer_id = ${user.id}`);
        if (changed === 0) return null;

        await tx.requestEvent.create({
          data: { requestId: id, actorId: user.id, type: status, fromStatus: "SUBMITTED", toStatus: status, reason },
        });
        return tx.approvalRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });

      if (!decided) return sendError(res, 409, "INVALID_TRANSITION", ALREADY_DECIDED);
      res.json({ request: toDetail(decided) });
    } catch (error) {
      next(error);
    }
  });
}
