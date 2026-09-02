import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import {
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  BadgeDollarSign,
  MapPin,
  Link2,
  Video,
  Clock,
  Sparkles,
} from "lucide-react";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const tomorrowStart = new Date(todayEnd.getTime() + 1000);

  // Execute all independent student dashboard queries in parallel
  const [
    attendanceRecords,
    batchActivities,
    assessmentAggregate,
    feePlan,
    todaysClasses,
    upcomingClasses,
  ] = await Promise.all([
    // 1. Attendance Records
    db.attendanceRecord.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      select: { status: true },
    }),

    // 2. Pending Activities
    student.batch_id
      ? db.activity.findMany({
          where: {
            institute_id: institute.id,
            batch_id: student.batch_id,
            status: "Published",
          },
          include: {
            submissions: { where: { student_id: student.id }, select: { status: true } },
          },
        })
      : Promise.resolve([]),

    // 3. Academic Average Aggregate
    db.assessmentResult.aggregate({
      where: { institute_id: institute.id, student_id: student.id },
      _avg: { percentage: true },
    }),

    // 4. Fee Plan
    db.feePlan.findFirst({
      where: { institute_id: institute.id, student_id: student.id },
      select: { balance: true },
    }),

    // 5. Today's Classes
    student.batch_id
      ? db.class.findMany({
          where: {
            institute_id: institute.id,
            batch_id: student.batch_id,
            date: { gte: todayStart, lte: todayEnd },
          },
          include: { mentor: { select: { name: true } } },
          orderBy: { start_time: "asc" },
        })
      : Promise.resolve([]),

    // 6. Upcoming Classes
    student.batch_id
      ? db.class.findMany({
          where: {
            institute_id: institute.id,
            batch_id: student.batch_id,
            date: { gte: tomorrowStart },
            status: "Scheduled",
          },
          include: { mentor: { select: { name: true } } },
          orderBy: { date: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  // Attendance % Calculation
  const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;
  const totalAttendanceDenom = presentCount + lateCount + absentCount;

  const attendancePct =
    totalAttendanceDenom > 0
      ? (((presentCount + lateCount) / totalAttendanceDenom) * 100).toFixed(0) + "%"
      : "—";

  // Pending Activities Count
  const pendingActivitiesCount = batchActivities.filter(
    (a) => a.submissions.length === 0 || a.submissions[0].status === "Needs Revision"
  ).length;

  // Academic Performance Average %
  const avgAcademicPct =
    assessmentAggregate._avg.percentage != null
      ? assessmentAggregate._avg.percentage.toFixed(0) + "%"
      : "—";

  // Fee Balance Due
  const feeBalanceDue = feePlan ? `${formatCurrency(feePlan.balance)} Due` : "—";

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "offline":
        return { label: "🏫 Offline", style: "bg-blue-100 text-blue-800 border-blue-200" };
      case "online":
        return { label: "🌐 Online", style: "bg-purple-100 text-purple-800 border-purple-200" };
      case "hybrid":
        return { label: "🔄 Hybrid", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "🔄 Hybrid", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
  };

  const modeBadge = getModeBadge(student.learning_mode);
  const initials = student.name
    ? student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  return (
    <StudentPortalWrapper>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-16 h-16 rounded-2xl object-cover border border-white/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {student.name} 👋
                  </h1>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${modeBadge.style}`}>
                    {modeBadge.label}
                  </span>
                </div>
                <p className="text-slate-300 text-xs font-mono font-bold">
                  Student ID: <span className="text-brand-300">{student.student_code}</span> • Course:{" "}
                  <span className="text-white font-semibold">{student.course?.name || "General Course"}</span> • Batch:{" "}
                  <span className="text-white font-semibold">{student.batch?.name || "General Batch"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/student/attendance"
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{attendancePct}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Calculated session rate</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/student/activities"
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activities</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">
                {pendingActivitiesCount > 0 ? `${pendingActivitiesCount} Pending` : "0 Pending"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigned coursework</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/student/marks"
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Performance</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{avgAcademicPct}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Overall assessment avg</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <FileBarChart className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/student/fees"
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuition Fees</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{feeBalanceDue}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Outstanding balance</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Today's Classes Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Today's Classes ({todaysClasses.length})</h3>
                <p className="text-xs text-slate-500">Live class schedule for {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <Link href="/student/classes" className="text-xs font-semibold text-brand-600 hover:underline">
              View All Schedule &rarr;
            </Link>
          </div>

          {todaysClasses.length > 0 ? (
            <div className="space-y-3">
              {todaysClasses.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-50 text-brand-700 border border-brand-200 capitalize">
                        {c.class_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Topic: <strong className="text-slate-800">{c.topic || "General Session"}</strong> • Mentor:{" "}
                      <strong className="text-slate-800">{c.mentor?.name || "Assigned Instructor"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="font-mono text-slate-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {c.start_time || "—"} – {c.end_time || "—"}
                    </span>

                    {c.class_type === "physical" && (
                      <span className="text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Room {c.room || "Main Hall"}
                      </span>
                    )}

                    {c.class_type === "live_online" && (
                      c.meeting_link ? (
                        <a
                          href={c.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white font-semibold bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Join Class
                        </a>
                      ) : (
                        <span className="text-purple-700 font-semibold bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                          Live Online
                        </span>
                      )
                    )}

                    {c.class_type === "recorded" && (
                      <Link
                        href="/student/content"
                        className="text-white font-semibold bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Watch Recording
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-400 border border-dashed border-slate-200">
              No classes scheduled for today.
            </div>
          )}
        </div>

        {/* Upcoming Classes Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-base">Upcoming Classes</h3>
            </div>
          </div>

          {upcomingClasses.length > 0 ? (
            <div className="space-y-2">
              {upcomingClasses.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{c.title}</span>
                    <span className="text-slate-500">{new Date(c.date).toLocaleDateString()} • {c.start_time || "—"}</span>
                  </div>
                  <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 capitalize">
                    {c.class_type.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              No upcoming classes scheduled.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
