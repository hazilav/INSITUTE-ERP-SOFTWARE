import { redirect, notFound } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Clock, FileCheck, CheckCircle2 } from "lucide-react";
import StudentSubmissionForm from "./StudentSubmissionForm";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

interface StudentActivityDetailPageProps {
  params: { id: string };
}

export default async function StudentActivityDetailPage({
  params,
}: StudentActivityDetailPageProps) {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const activity = await db.activity.findFirst({
    where: { id: params.id, institute_id: institute.id },
    include: {
      course: { select: { name: true } },
      batch: { select: { name: true } },
      mentor: { select: { name: true } },
      submissions: {
        where: { student_id: student.id },
      },
    },
  });

  if (!activity) notFound();

  const submission = activity.submissions[0] || null;

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
        <Link
          href="/student/activities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Activities
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activity.title}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                {activity.activity_type}
              </span>
            </div>

            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
              <span>Course: <strong className="text-slate-800">{activity.course.name}</strong></span>
              <span>•</span>
              <span>Batch: <strong className="text-slate-800">{activity.batch.name}</strong></span>
              <span>•</span>
              <span className="font-mono text-purple-700 font-semibold">
                Due Date: {new Date(activity.due_date).toLocaleDateString()}
              </span>
            </p>
          </div>

          {activity.description && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Instructions & Description</h3>
              <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {activity.description}
              </p>
            </div>
          )}

          {/* Reviewed Submission Feedback Banner */}
          {submission && submission.status === "Reviewed" && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reviewed by Mentor ({activity.mentor?.name || "Instructor"})
                </span>
                <span className="font-mono font-extrabold text-emerald-700 text-base">
                  Score: {submission.obtained_marks} / {activity.maximum_marks}
                </span>
              </div>
              {submission.feedback && (
                <p className="text-xs text-emerald-800 bg-white p-3 rounded-xl border border-emerald-200">
                  "{submission.feedback}"
                </p>
              )}
            </div>
          )}

          {/* Online Submission Form Component */}
          <StudentSubmissionForm
            activityId={activity.id}
            existingSubmission={submission ? {
              id: submission.id,
              submission_text: submission.submission_text,
              file_url: submission.file_url,
              status: submission.status,
              submitted_at: submission.submitted_at.toISOString(),
            } : null}
          />
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
