-- Safe Additive Migration: Invoices & Payment Enhancements

-- 1. Alter "institutes" table
ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "tax_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "tax_name" TEXT DEFAULT 'GST';
ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "tax_percentage" DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "tax_number" TEXT;

-- 2. Create "invoices" table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "institute_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT,
    "fee_plan_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "final_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outstanding_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'Unpaid',
    "notes" TEXT,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- 3. Invoices Indexes & Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_institute_id_invoice_number_key" ON "invoices"("institute_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_institute_id_student_id_idx" ON "invoices"("institute_id", "student_id");
CREATE INDEX IF NOT EXISTS "invoices_institute_id_status_idx" ON "invoices"("institute_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_institute_id_invoice_date_idx" ON "invoices"("institute_id", "invoice_date");

-- 4. Alter "payments" table
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "is_voided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "void_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "voided_by_id" TEXT;
ALTER TABLE "payments" ALTER COLUMN "fee_plan_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "payments_institute_id_invoice_id_idx" ON "payments"("institute_id", "invoice_id");

-- 5. Foreign Key Constraints (Safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_institute_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_student_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_course_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_fee_plan_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fee_plan_id_fkey" FOREIGN KEY ("fee_plan_id") REFERENCES "fee_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_created_by_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_cancelled_by_id_fkey') THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_invoice_id_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_voided_by_id_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
