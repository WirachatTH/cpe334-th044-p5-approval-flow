-- The rules of the rejection category (F-04 contract section 2.3, SDS section 3.3). add_rejection_category created the
-- enum and the columns; this migration adds the CHECK constraints. No constraint requires a category: earlier
-- rejections have none, and the previous revision's code, which writes none, keeps working.

-- Only a rejected request has a category (BR-12).
ALTER TABLE "request" ADD CONSTRAINT "request_category_only_on_rejection" CHECK (
  decision_category IS NULL OR status = 'REJECTED'
);

-- The same for the history (BR-12, BR-13).
ALTER TABLE "request_event" ADD CONSTRAINT "request_event_category_only_on_rejection" CHECK (
  category IS NULL OR type = 'REJECTED'
);
