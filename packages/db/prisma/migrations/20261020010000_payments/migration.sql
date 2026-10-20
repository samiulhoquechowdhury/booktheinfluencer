-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "public"."PaymentMilestone" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "receiptNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMilestone_receiptNo_key" ON "public"."PaymentMilestone"("receiptNo");


-- Receipt numbers (PAY-5)
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1000;
