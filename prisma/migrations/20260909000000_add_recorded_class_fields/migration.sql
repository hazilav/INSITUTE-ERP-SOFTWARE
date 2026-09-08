-- AlterTable
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "teacher_name" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "class_date" TIMESTAMP(3);
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "storage_key" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "file_size" TEXT;
ALTER TABLE "recorded_contents" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recorded_contents_institute_id_course_id_idx" ON "recorded_contents"("institute_id", "course_id");
CREATE INDEX IF NOT EXISTS "recorded_contents_institute_id_publish_status_idx" ON "recorded_contents"("institute_id", "publish_status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'recorded_contents_batch_id_fkey'
    ) THEN
        ALTER TABLE "recorded_contents" ADD CONSTRAINT "recorded_contents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'recorded_contents_created_by_id_fkey'
    ) THEN
        ALTER TABLE "recorded_contents" ADD CONSTRAINT "recorded_contents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
