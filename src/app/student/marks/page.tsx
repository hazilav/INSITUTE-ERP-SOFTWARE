import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import { FileBarChart, Award, CheckCircle2 } from "lucide-react";
import { calculateGrade } from "@/lib/grading";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentMarksPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const assessmentResults = await db.assessmentResult.findMany({
    where: { institute_id: institute.id, student_id: student.id },
    include: {
      assessment: {
        include: { course: { select: { name: true } } },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const completedCount = assessmentResults.length;
  const totalPctSum = assessmentResults.reduce((acc, r) => acc + r.percentage, 0);
  const avgPct =
    completedCount > 0 ? (totalPctSum / completedCount).toFixed(2) : null;
  const overallGrade = avgPct !== null ? calculateGrade(parseFloat(avgPct)) : "—";

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Results & Academic Performance
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Official assessment marks and grade evaluations for {student.name}
          </p>
        </div>

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Performance</p>
              <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{avgPct !== null ? `${avgPct}%` : "—"}</p>
            </div>
            <FileBarChart className="w-6 h-6 text-brand-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Grade</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{overallGrade}</p>
            </div>
            <Award className="w-6 h-6 text-amber-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessments Completed</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{completedCount}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Assessment History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {assessmentResults.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[650px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Assessment Name</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Obtained / Max</th>
                    <th className="px-6 py-3.5 text-right">Percentage</th>
                    <th className="px-6 py-3.5 text-center">Grade</th>
                    <th className="px-6 py-3.5 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {assessmentResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-bold text-slate-900">{r.assessment.name}</td>
                      <td className="px-6 py-4 font-mono">{new Date(r.assessment.assessment_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {r.obtained_marks} / {r.assessment.maximum_marks}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-brand-600">
                        {r.percentage.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-extrabold text-amber-600">
                        {r.grade}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2 py-0.5 font-bold rounded ${
                            r.is_pass
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {r.is_pass ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              No published examination results available yet.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
