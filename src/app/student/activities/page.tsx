import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import Link from "next/link";
import { ClipboardList, Clock, FileCheck, CheckCircle2 } from "lucide-react";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentActivitiesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  let activitiesList: any[] = [];

  if (student.batch_id) {
    activitiesList = await db.activity.findMany({
      where: {
        institute_id: institute.id,
        batch_id: student.batch_id,
        status: "Published",
      },
      include: {
        course: { select: { name: true } },
        submissions: {
          where: { student_id: student.id },
        },
      },
      orderBy: { due_date: "asc" },
    });
  }

  const now = new Date();

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Activities & Coursework
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assigned assignments, projects, and homework for your batch ({student.batch?.name || "General Batch"})
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          {activitiesList.length > 0 ? (
            <div className="space-y-3">
              {activitiesList.map((act) => {
                const submission = act.submissions[0];
                const isOverdue = !submission && new Date(act.due_date) < now;

                const statusLabel = submission
                  ? submission.status
                  : isOverdue
                  ? "Overdue"
                  : "Pending";

                const statusStyle = submission
                  ? submission.status === "Reviewed"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                  : isOverdue
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-amber-100 text-amber-800 border-amber-200";

                return (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{act.title}</span>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Type: <strong className="text-slate-800">{act.activity_type}</strong> • Course:{" "}
                        <strong className="text-slate-800">{act.course.name}</strong> • Max Marks:{" "}
                        <strong className="text-slate-800">{act.maximum_marks}</strong>
                      </p>
                      {submission?.obtained_marks !== undefined && submission?.obtained_marks !== null && (
                        <p className="text-xs font-mono font-bold text-emerald-600 pt-0.5">
                          Obtained Marks: {submission.obtained_marks} / {act.maximum_marks}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Due: {new Date(act.due_date).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/student/activities/${act.id}`}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-xs"
                      >
                        {submission ? "View Submission" : "Submit Activity"} &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              No coursework activities assigned to your batch.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
