-- Return and resubmission (F-06 contract section 2.3): the new status and history values and the revision of a request.
-- The rules that use the new values are in the migration add_request_return_rules.

-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'RETURNED';

-- AlterEnum
ALTER TYPE "RequestEventType" ADD VALUE 'RETURNED';
ALTER TYPE "RequestEventType" ADD VALUE 'RESUBMITTED';

-- AlterTable
ALTER TABLE "request" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;
