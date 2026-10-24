-- Talent self-onboarding: submitted for review, and staff feedback.
ALTER TABLE "Talent" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Talent" ADD COLUMN "reviewNote" TEXT;
