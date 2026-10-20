-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "authMethod" TEXT NOT NULL DEFAULT 'otp';

