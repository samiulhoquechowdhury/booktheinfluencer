-- CreateTable
CREATE TABLE "public"."ContactMessage" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactMessage_ref_key" ON "public"."ContactMessage"("ref");

-- CreateIndex
CREATE INDEX "ContactMessage_createdIp_createdAt_idx" ON "public"."ContactMessage"("createdIp", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_handledAt_createdAt_idx" ON "public"."ContactMessage"("handledAt", "createdAt");


CREATE SEQUENCE IF NOT EXISTS contact_seq START 1000;
