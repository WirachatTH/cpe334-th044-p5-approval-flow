-- The rules of the second approval (F-07 contract section 2.3, BR-10 and BR-17). A separate migration, because a new
-- enum value cannot be used in the transaction that adds it. The database does not require two approvals above the
-- threshold: requests approved before this release have one. The application requires it.

-- A first approval records who and when together.
ALTER TABLE "request" ADD CONSTRAINT "request_first_approval_fields" CHECK (
  (first_approved_by_id IS NULL) = (first_approved_at IS NULL)
);

-- A waiting request has its first approval, which is also its latest decision.
ALTER TABLE "request" ADD CONSTRAINT "request_awaiting_second_approval" CHECK (
  status <> 'AWAITING_SECOND_APPROVAL' OR (first_approved_by_id IS NOT NULL AND decided_by_id = first_approved_by_id)
);

-- The two approvers are different people.
ALTER TABLE "request" ADD CONSTRAINT "request_second_approver_differs" CHECK (
  status NOT IN ('APPROVED', 'REJECTED') OR first_approved_by_id IS NULL OR decided_by_id <> first_approved_by_id
);

-- Nobody decides their own request.
ALTER TABLE "request" ADD CONSTRAINT "request_decider_not_requester" CHECK (
  decided_by_id IS NULL OR decided_by_id <> requester_id
);

-- A first approval exists only where it can, and never by the requester.
ALTER TABLE "request" ADD CONSTRAINT "request_first_approval_scope" CHECK (
  first_approved_by_id IS NULL
  OR (status IN ('AWAITING_SECOND_APPROVAL', 'APPROVED', 'REJECTED') AND first_approved_by_id <> requester_id)
);
