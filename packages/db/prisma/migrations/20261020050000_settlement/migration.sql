-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "cancelPolicyRef" TEXT;

-- AlterTable
ALTER TABLE "public"."Payout" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "scheduledFor" DATE;

