-- The rejection category (F-04 contract section 2.3, BR-12): the enum and the two nullable columns only. The rules
-- that keep a category off everything but a rejection come in add_rejection_category_rules. No backfill: earlier
-- rejections have no category, and the previous revision's code keeps working against these columns.

-- CreateEnum
CREATE TYPE "rejection_category" AS ENUM ('BUDGET', 'INCOMPLETE', 'DUPLICATE', 'POLICY', 'OTHER');

-- AlterTable
ALTER TABLE "request" ADD COLUMN     "decision_category" "rejection_category";

-- AlterTable
ALTER TABLE "request_event" ADD COLUMN     "category" "rejection_category";
