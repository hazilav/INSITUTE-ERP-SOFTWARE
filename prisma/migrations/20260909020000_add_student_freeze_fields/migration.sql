-- AlterTable: Add student freeze fields
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "freeze_reason" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "frozen_at" TIMESTAMP(3);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "frozen_by" TEXT;
