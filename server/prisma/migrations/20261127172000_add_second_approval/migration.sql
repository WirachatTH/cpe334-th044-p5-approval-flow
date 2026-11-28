-- Second approval (F-07 contract section 2.3): the new status and history values and who gave the first approval.
-- The rules that use them are in the migration add_second_approval_rules.

-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'AWAITING_SECOND_APPROVAL';

-- AlterEnum
ALTER TYPE "RequestEventType" ADD VALUE 'FIRST_APPROVED';

-- AlterTable
ALTER TABLE "request" ADD COLUMN     "first_approved_by_id" INTEGER,
ADD COLUMN     "first_approved_at" TIMESTAMPTZ;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_first_approved_by_id_fkey" FOREIGN KEY ("first_approved_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
