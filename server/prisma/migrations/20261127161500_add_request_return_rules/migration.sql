-- The rules of return and resubmission (F-06 contract section 2.3, BR-16). A separate migration, because a new enum
-- value cannot be used in the transaction that adds it, and so that the database tests could fail on missing rules.

-- A returned request always has its comment. request_decision_fields already requires who returned it, and when.
ALTER TABLE "request" ADD CONSTRAINT "request_return_comment" CHECK (
  status <> 'RETURNED' OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0)
);

-- The same for the history (BR-13).
ALTER TABLE "request_event" ADD CONSTRAINT "request_event_return_comment" CHECK (
  type <> 'RETURNED' OR (reason IS NOT NULL AND length(btrim(reason)) > 0)
);

-- The revision counts resubmissions.
ALTER TABLE "request" ADD CONSTRAINT "request_revision_not_negative" CHECK (revision >= 0);
