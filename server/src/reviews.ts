import type { Express } from "express";
import { RejectionCategory, type PrismaClient } from "@prisma/client";
import type { AuthLocals } from "./authorization.js";
import { sendError } from "./errors.js";
import {
  REVISION_INVALID, findRequest, isStale, readRevision, refuseLostWrite, refuseStale, refuseStatus,
} from "./requestActions.js";
import { detailInclude, toDetail } from "./requests.js";

// The review inbox, the decision (F-04 contract), and the return of a request (F-06 contract). The caller is always
// the signed-in user. The rules are checked in the order of section 1.2 of the contract, and the first one that fails
// answers.

const REJECTION_REASON_MIN = 10;
const REASON_MAX = 1000;
const CATEGORIES: readonly string[] = Object.values(RejectionCategory);

const CHOOSE_DECISION = "Choose approve or reject.";
const REASON_REQUIRED = "Enter a reason to reject this request.";
const REASON_TEXT = "Enter the reason as text.";
const REASON_TOO_SHORT = "Reason must be at least 10 characters.";
const REASON_TOO_LONG = "Reason must be 1,000 characters or fewer.";
const CHOOSE_CATEGORY = "Choose a rejection category.";
const CATEGORY_NOT_ALLOWED = "A category applies to a rejection only.";
const COMMENT_REQUIRED = "Enter a comment to return this request.";
const COMMENT_TEXT = "Enter the comment as text.";
const COMMENT_TOO_LONG = "Comment must be 1,000 characters or fewer.";

interface Decision {
  decision: "APPROVE" | "REJECT";
  reason: string | null;
  category: RejectionCategory | null;
  revision: number | null;
}

// F-04 section 1.4. Every problem is reported at once; the reason is stored trimmed. Both reason limits count Unicode
// code points.
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
    const length = [...trimmed].length;
    if (reason === null && decision === "REJECT") fields.reason = REASON_REQUIRED;
    else if (decision === "REJECT" && length < REJECTION_REASON_MIN) fields.reason = REASON_TOO_SHORT;
    else if (length > REASON_MAX) fields.reason = REASON_TOO_LONG;
  }

  // A rejection needs one category from the list and an approval takes none (BR-12).
  let category: RejectionCategory | null = null;
  if (decision === "REJECT") {
    if (typeof input.category === "string" && CATEGORIES.includes(input.category)) {
      category = input.category as RejectionCategory;
    } else {
      fields.category = CHOOSE_CATEGORY;
    }
  } else if (decision === "APPROVE" && input.category !== undefined && input.category !== null) {
    fields.category = CATEGORY_NOT_ALLOWED;
  }

  const revision = readRevision(input.revision);
  if (!revision.ok) fields.revision = REVISION_INVALID;

  if (!revision.ok || Object.keys(fields).length > 0) return { ok: false, fields };
  const value = { decision: decision as Decision["decision"], reason, category, revision: revision.revision };
  return { ok: true, value };
}

interface Return {
  comment: string;
  revision: number | null;
}

// F-06 section 1.4. The comment is stored trimmed, and its limit counts Unicode code points.
function parseReturn(body: unknown): { ok: true; value: Return } | { ok: false; fields: Record<string, string> } {
  const input = (typeof body === "object" && body !== null && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  let comment = "";
  if (input.comment !== undefined && input.comment !== null && typeof input.comment !== "string") {
    fields.comment = COMMENT_TEXT;
  } else {
    comment = typeof input.comment === "string" ? input.comment.trim() : "";
    if (comment === "") fields.comment = COMMENT_REQUIRED;
    else if ([...comment].length > REASON_MAX) fields.comment = COMMENT_TOO_LONG;
  }

  const revision = readRevision(input.revision);
  if (!revision.ok) fields.revision = REVISION_INVALID;

  if (!revision.ok || Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { comment, revision: revision.revision } };
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
      const found = await findRequest(prisma, req.params.id);
      if (!found) return sendError(res, 404, "NOT_FOUND", "Not found.");
      const { id } = found;

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
      if (found.status !== "SUBMITTED") return refuseStatus(res, found.status);
      // The content the reviewer saw is the content that is decided (BR-16, F-06 section 1.2).
      if (isStale(parsed.value.revision, found.revision)) return refuseStale(res);

      // Step 7 (BR-13, BR-14). The UPDATE matches only while the request is still SUBMITTED and assigned to the
      // caller, so of two simultaneous decisions only one changes a row. The other changes none, and nothing is
      // written for it. One timestamp, from the application clock like every other time in the system, is used for
      // the decision and for its history entry, so the two always show the same time.
      const { decision, reason, category } = parsed.value;
      const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      const now = new Date();
      const decided = await prisma.$transaction(async (tx) => {
        const changed = await tx.approvalRequest.updateMany({
          where: { id, status: "SUBMITTED", assignedReviewerId: user.id, revision: found.revision },
          data: {
            status,
            decidedById: user.id,
            decidedAt: now,
            decisionReason: reason,
            decisionCategory: category,
            updatedAt: now,
          },
        });
        if (changed.count === 0) return null;

        await tx.requestEvent.create({
          data: {
            requestId: id,
            actorId: user.id,
            type: status,
            fromStatus: "SUBMITTED",
            toStatus: status,
            reason,
            category,
            createdAt: now,
          },
        });
        return tx.approvalRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });

      if (!decided) return refuseLostWrite(res, prisma, id);
      res.json({ request: toDetail(decided) });
    } catch (error) {
      next(error);
    }
  });

  // F-06 section 1.2: the assigned reviewer returns a SUBMITTED request to its requester with a comment.
  app.post("/api/requests/:id/return", async (req, res, next) => {
    try {
      const user = me(res.locals);
      const found = await findRequest(prisma, req.params.id);
      if (!found) return sendError(res, 404, "NOT_FOUND", "Not found.");
      if (found.requesterId === user.id) {
        return sendError(res, 403, "SELF_REVIEW_FORBIDDEN", "You cannot return a request you submitted.");
      }
      if (found.assignedReviewerId !== user.id) return sendError(res, 404, "NOT_FOUND", "Not found.");

      const parsed = parseReturn(req.body);
      if (!parsed.ok) return sendError(res, 400, "VALIDATION_ERROR", "Some fields need attention.", parsed.fields);
      if (found.status !== "SUBMITTED") return refuseStatus(res, found.status);
      if (isStale(parsed.value.revision, found.revision)) return refuseStale(res);

      // While the request is RETURNED, the decision columns hold who returned it, when, and the comment.
      const { id } = found;
      const { comment } = parsed.value;
      const now = new Date();
      const returned = await prisma.$transaction(async (tx) => {
        const changed = await tx.approvalRequest.updateMany({
          where: { id, status: "SUBMITTED", assignedReviewerId: user.id, revision: found.revision },
          data: { status: "RETURNED", decidedById: user.id, decidedAt: now, decisionReason: comment, updatedAt: now },
        });
        if (changed.count === 0) return null;

        await tx.requestEvent.create({
          data: {
            requestId: id,
            actorId: user.id,
            type: "RETURNED",
            fromStatus: "SUBMITTED",
            toStatus: "RETURNED",
            reason: comment,
            createdAt: now,
          },
        });
        return tx.approvalRequest.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });

      if (!returned) return refuseLostWrite(res, prisma, id);
      res.json({ request: toDetail(returned) });
    } catch (error) {
      next(error);
    }
  });
}
