-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestEventType" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "request" (
    "id" SERIAL NOT NULL,
    "request_number" VARCHAR(10) NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "assigned_reviewer_id" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decided_by_id" INTEGER,
    "decision_reason" VARCHAR(1000),
    "decided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_event" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "type" "RequestEventType" NOT NULL,
    "from_status" "RequestStatus",
    "to_status" "RequestStatus" NOT NULL,
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_number_unique" ON "request"("request_number");

-- CreateIndex
CREATE INDEX "request_requester_id_created_at_idx" ON "request"("requester_id", "created_at");

-- CreateIndex
CREATE INDEX "request_assigned_reviewer_id_status_idx" ON "request"("assigned_reviewer_id", "status");

-- CreateIndex
CREATE INDEX "request_event_request_id_created_at_id_idx" ON "request_event"("request_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_assigned_reviewer_id_fkey" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_event" ADD CONSTRAINT "request_event_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_event" ADD CONSTRAINT "request_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
