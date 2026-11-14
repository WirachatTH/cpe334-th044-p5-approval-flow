import type { ErrorRequestHandler, RequestHandler, Response } from "express";

// The error envelope shared by every route (SDS §5, F-02 contract §2.2): only an `error` object, with a message
// that is always safe to show. Never a stack trace, SQL, file path, internal id, or secret.

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): void {
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
}

export const notFound: RequestHandler = (_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Not found.");
};

interface HttpishError {
  name?: string;
  type?: string;
  status?: number;
}

// Body-parser errors carry a type and a status: a body over the limit is 413, an unreadable one is a validation
// error. Everything else is a fixed 500; the details stay on the server (and are not logged with their message,
// which could carry data).
export const errorHandler: ErrorRequestHandler = (error: HttpishError, _req, res, _next) => {
  if (res.headersSent) return;
  if (error?.type === "entity.too.large") {
    return sendError(res, 413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  }
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 500) {
    return sendError(res, 400, "VALIDATION_ERROR", "Some fields need attention.");
  }
  console.error(`error: ${error?.name ?? "unknown"}`);
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
};
