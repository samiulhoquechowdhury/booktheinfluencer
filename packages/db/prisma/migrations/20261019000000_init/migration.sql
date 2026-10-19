-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS', 'TALENT', 'REP', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."RepresentationType" AS ENUM ('TALENT_MANAGED', 'AGENCY_MANAGED', 'PLATFORM_COORDINATED');

-- CreateEnum
CREATE TYPE "public"."ProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "public"."TalentTier" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."LeadStage" AS ENUM ('NEW', 'CONTACTED', 'REQUIREMENT_RECEIVED', 'SHORTLISTED', 'AVAILABILITY_CHECK', 'QUOTE_SENT', 'NEGOTIATION', 'ADVANCE_PENDING', 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('NOT_CHECKED', 'AWAITING_MANAGER', 'HOLD_REQUESTED', 'AVAILABLE', 'TENTATIVE', 'UNAVAILABLE', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."LineItemType" AS ENUM ('TALENT_FEE', 'TRAVEL', 'ACCOMMODATION', 'LOCAL_TRANSPORT', 'SECURITY', 'PRODUCTION', 'SERVICE_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'SIGNED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'LINK_SENT', 'PAID', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PAID', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "mfaSecret" TEXT,
    "roles" "public"."Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Talent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "tagline" TEXT,
    "bio" TEXT,
    "baseCity" TEXT NOT NULL,
    "travelsTo" TEXT[],
    "travelsPanIndia" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[],
    "eventTypes" TEXT[],
    "tags" TEXT[],
    "tier" "public"."TalentTier" NOT NULL DEFAULT 'STANDARD',
    "status" "public"."ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "representationType" "public"."RepresentationType" NOT NULL,
    "feeBandMinPaise" BIGINT,
    "feeBandMaxPaise" BIGINT,
    "showreelUrl" TEXT,
    "riderSummary" TEXT,
    "userId" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TalentCategory" (
    "talentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TalentCategory_pkey" PRIMARY KEY ("talentId","categoryId")
);

-- CreateTable
CREATE TABLE "public"."TalentMedia" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "kind" "public"."MediaKind" NOT NULL DEFAULT 'IMAGE',
    "key" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "credit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TalentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateCard" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "eventType" TEXT,
    "minimumRatePaise" BIGINT NOT NULL,
    "sellingRatePaise" BIGINT NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Representative" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agencyName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "verification" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "kycDocumentIds" TEXT[],
    "userId" TEXT,

    CONSTRAINT "Representative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TalentRep" (
    "talentId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,

    CONSTRAINT "TalentRep_pkey" PRIMARY KEY ("talentId","repId")
);

-- CreateTable
CREATE TABLE "public"."Blackout" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,

    CONSTRAINT "Blackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Favourite" (
    "userId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("userId","talentId")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "stage" "public"."LeadStage" NOT NULL DEFAULT 'NEW',
    "ownerId" TEXT,
    "customerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "altDate" DATE,
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "audienceSize" INTEGER,
    "durationMins" INTEGER,
    "budgetMinPaise" BIGINT,
    "budgetMaxPaise" BIGINT,
    "language" TEXT,
    "notes" TEXT,
    "companyName" TEXT,
    "gstin" TEXT,
    "source" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "availability" "public"."AvailabilityStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "repAcceptedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "sellingTotalPaise" BIGINT,
    "payoutTotalPaise" BIGINT,
    "marginPaise" BIGINT,
    "opsChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Quote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotalPaise" BIGINT NOT NULL,
    "taxPaise" BIGINT NOT NULL,
    "totalPaise" BIGINT NOT NULL,
    "internalCostPaise" BIGINT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "acceptedIp" TEXT,
    "approvedById" TEXT,
    "changeRequest" TEXT,
    "notes" TEXT,
    "milestonePlan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" "public"."LineItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "customerAmountPaise" BIGINT NOT NULL,
    "internalCostPaise" BIGINT NOT NULL,
    "payoutPaise" BIGINT,
    "taxRateBps" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "documentId" TEXT,
    "providerRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMilestone" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "isAdvance" BOOLEAN NOT NULL DEFAULT false,
    "gatewayLinkId" TEXT,

    CONSTRAINT "PaymentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "gatewayPaymentId" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "proofDocumentId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "status" "public"."PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "body" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "public"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_slug_key" ON "public"."Talent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_userId_key" ON "public"."Talent"("userId");

-- CreateIndex
CREATE INDEX "Talent_status_tier_idx" ON "public"."Talent"("status", "tier");

-- CreateIndex
CREATE INDEX "Talent_searchVector_idx" ON "public"."Talent" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Talent_stageName_trgm_idx" ON "public"."Talent" USING GIN ("stageName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "TalentCategory_categoryId_idx" ON "public"."TalentCategory"("categoryId");

-- CreateIndex
CREATE INDEX "TalentMedia_talentId_sortOrder_idx" ON "public"."TalentMedia"("talentId", "sortOrder");

-- CreateIndex
CREATE INDEX "RateCard_talentId_idx" ON "public"."RateCard"("talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Representative_userId_key" ON "public"."Representative"("userId");

-- CreateIndex
CREATE INDEX "TalentRep_repId_idx" ON "public"."TalentRep"("repId");

-- CreateIndex
CREATE UNIQUE INDEX "Blackout_talentId_date_key" ON "public"."Blackout"("talentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_ref_key" ON "public"."Lead"("ref");

-- CreateIndex
CREATE INDEX "Lead_stage_ownerId_idx" ON "public"."Lead"("stage", "ownerId");

-- CreateIndex
CREATE INDEX "Lead_eventDate_idx" ON "public"."Lead"("eventDate");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "public"."Lead"("customerId");

-- CreateIndex
CREATE INDEX "Booking_talentId_idx" ON "public"."Booking"("talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_leadId_talentId_key" ON "public"."Booking"("leadId", "talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_bookingId_version_key" ON "public"."Quote"("bookingId", "version");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "public"."QuoteLineItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_providerRef_key" ON "public"."Contract"("providerRef");

-- CreateIndex
CREATE INDEX "Contract_bookingId_idx" ON "public"."Contract"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMilestone_gatewayLinkId_key" ON "public"."PaymentMilestone"("gatewayLinkId");

-- CreateIndex
CREATE INDEX "PaymentMilestone_status_dueDate_idx" ON "public"."PaymentMilestone"("status", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentMilestone_bookingId_idx" ON "public"."PaymentMilestone"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "public"."Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_milestoneId_idx" ON "public"."Payment"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_bookingId_key" ON "public"."Payout"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_key_key" ON "public"."Document"("key");

-- CreateIndex
CREATE INDEX "Document_ownerType_ownerId_idx" ON "public"."Document"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "public"."Activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "public"."AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Talent" ADD CONSTRAINT "Talent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TalentCategory" ADD CONSTRAINT "TalentCategory_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TalentCategory" ADD CONSTRAINT "TalentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TalentMedia" ADD CONSTRAINT "TalentMedia_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RateCard" ADD CONSTRAINT "RateCard_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Representative" ADD CONSTRAINT "Representative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TalentRep" ADD CONSTRAINT "TalentRep_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TalentRep" ADD CONSTRAINT "TalentRep_repId_fkey" FOREIGN KEY ("repId") REFERENCES "public"."Representative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blackout" ADD CONSTRAINT "Blackout_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favourite" ADD CONSTRAINT "Favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favourite" ADD CONSTRAINT "Favourite_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "public"."Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quote" ADD CONSTRAINT "Quote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."PaymentMilestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

