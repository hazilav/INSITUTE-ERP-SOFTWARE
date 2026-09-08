-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN IF NOT EXISTS "assigned_course_id" TEXT;
ALTER TABLE "staff_profiles" ADD COLUMN IF NOT EXISTS "assigned_batch_id" TEXT;
ALTER TABLE "staff_profiles" ADD COLUMN IF NOT EXISTS "permissions" TEXT DEFAULT 'students,attendance,tasks,activities,notes,announcements';

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_profiles_assigned_course_id_fkey'
    ) THEN
        ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_assigned_course_id_fkey" FOREIGN KEY ("assigned_course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_profiles_assigned_batch_id_fkey'
    ) THEN
        ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_assigned_batch_id_fkey" FOREIGN KEY ("assigned_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
