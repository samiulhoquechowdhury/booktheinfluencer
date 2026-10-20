-- AlterTable
ALTER TABLE "public"."Lead" ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "public"."Quote" ADD COLUMN     "approvalReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gstBps" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN     "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sentAt" TIMESTAMP(3);

