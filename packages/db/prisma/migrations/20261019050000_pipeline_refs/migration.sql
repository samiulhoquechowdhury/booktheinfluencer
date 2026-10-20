-- Reference-number sequences. Start at 1000 so they never collide with seed refs (…000101).
CREATE SEQUENCE IF NOT EXISTS lead_ref_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1000;

-- Booking.ref: add nullable, backfill existing rows, then enforce.
ALTER TABLE "public"."Booking" ADD COLUMN "ref" TEXT;
UPDATE "public"."Booking"
  SET "ref" = 'BK-' || to_char("createdAt", 'YYYY') || '-' || lpad(nextval('booking_ref_seq')::text, 6, '0')
  WHERE "ref" IS NULL;
ALTER TABLE "public"."Booking" ALTER COLUMN "ref" SET NOT NULL;
CREATE UNIQUE INDEX "Booking_ref_key" ON "public"."Booking"("ref");

-- Lead.createdIp for the enquiry rate limit.
ALTER TABLE "public"."Lead" ADD COLUMN "createdIp" TEXT;
CREATE INDEX "Lead_createdIp_createdAt_idx" ON "public"."Lead"("createdIp", "createdAt");
