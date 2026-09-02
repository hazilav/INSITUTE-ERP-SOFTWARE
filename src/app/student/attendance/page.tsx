import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const attendanceRecords = await db.attendanceRecord.findMany({
    where: { institute_id: institute.id, student_id: student.id },
    include: {
      classItem: { select: { title: true, room: true } },
    },
    orderBy: { date: "desc" },
  });

  const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;
  const leaveCount = attendanceRecords.filter((r) => r.status === "Leave").length;

  const totalDenom = presentCount + lateCount + absentCount;
  const attendancePct =
    totalDenom > 0 ? (((presentCount + lateCount) / totalDenom) * 100).toFixed(2) + "%" : "0.00%";

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Attendance Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Official attendance log verified by your institute instructors
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance %</p>
              <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{attendancePct}</p>
            </div>
            <CalendarCheck className="w-6 h-6 text-brand-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{presentCount}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{absentCount}</p>
            </div>
            <XCircle className="w-6 h-6 text-rose-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{lateCount}</p>
            </div>
            <Clock className="w-6 h-6 text-amber-500" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On Leave</p>
              <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{leaveCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-purple-500" />
          </div>
        </div>

        {/* Attendance History Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {attendanceRecords.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Class Title</th>
                    <th className="px-6 py-3.5">Class Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {attendanceRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{r.classItem.title}</td>
                      <td className="px-6 py-4 capitalize">{r.class_type.replace("_", " ")}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 font-bold rounded-md border ${
                            r.status === "Present"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : r.status === "Absent"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : r.status === "Late"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-purple-100 text-purple-800 border-purple-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{r.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              No attendance records found for your student profile.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
