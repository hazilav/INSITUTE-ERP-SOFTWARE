import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import {
  Users,
  UserCheck,
  CalendarCheck,
  BadgeDollarSign,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  MapPin,
  Link2,
  Video,
  Clock,
} from "lucide-react";
import PortalQuickShareCard from "@/components/PortalQuickShareCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;
  const isStaffOrMentor = user.role === "STAFF" || user.role === "MENTOR";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Section 11: STAFF / MENTOR DAILY WORK DASHBOARD
  if (isStaffOrMentor) {
    const todayClasses = await db.class.findMany({
      where: {
        institute_id: institute.id,
        date: { gte: todayStart, lte: todayEnd },
        ...(user.role === "MENTOR" ? { mentor_id: user.id } : {}),
      },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    const myPendingTasks = await db.studentTask.findMany({
      where: {
        institute_id: institute.id,
        status: { in: ["Pending", "In Progress"] },
      },
      orderBy: { due_date: "asc" },
      take: 5,
    });

    const staffProfile = await db.staffProfile.findFirst({
      where: { institute_id: institute.id, user_id: user.id },
    });

    const todayStaffAttendance = staffProfile
      ? await db.staffAttendance.findFirst({
          where: {
            institute_id: institute.id,
            staff_id: staffProfile.id,
            attendance_date: { gte: todayStart, lte: todayEnd },
          },
        })
      : null;

    const pendingActivitiesCount = await db.activity.count({
      where: {
        institute_id: institute.id,
        ...(user.role === "MENTOR" ? { mentor_id: user.id } : {}),
      },
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-brand-300 font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Staff Daily Work Workspace
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Good Morning, {user.name} 👋
              </h1>
              <p className="text-slate-400 text-sm">
                {institute.name} • Role: <span className="text-white font-bold uppercase">{user.role}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/classes"
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-md shadow-brand-600/30 flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" /> My Classes
              </Link>
              <Link
                href="/dashboard/attendance"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700 flex items-center gap-2"
              >
                <CalendarCheck className="w-4 h-4 text-emerald-400" /> Attendance
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Classes</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{todayClasses.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Tasks</p>
              <p className="text-2xl font-extrabold text-amber-600 tracking-tight">{myPendingTasks.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</p>
              <p className="text-xl font-extrabold text-emerald-600 tracking-tight">
                {todayStaffAttendance?.status || "Present"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activities</p>
              <p className="text-2xl font-extrabold text-purple-600 tracking-tight">{pendingActivitiesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Classes & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" /> Today's Classes
              </h3>
            </div>
            {todayClasses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((cls) => (
                  <div key={cls.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{cls.title}</p>
                      <p className="text-xs text-slate-500">Course: {cls.course?.name || "—"}</p>
                    </div>
                    {cls.meeting_link ? (
                      <a href={cls.meeting_link} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" /> Join Class
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 font-semibold">{cls.room || "Room"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" /> My Tasks
              </h3>
            </div>
            {myPendingTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending tasks assigned.</p>
            ) : (
              <div className="space-y-3">
                {myPendingTasks.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <p className="font-bold text-slate-900 text-sm">{t.title}</p>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800">{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Section 5: OWNER / ADMIN UNCROWDED DASHBOARD
  const totalStudents = await db.student.count({
    where: { institute_id: institute.id, is_archived: false },
  });

  const todayAttendanceRecords = await db.attendanceRecord.findMany({
    where: {
      institute_id: institute.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    select: { status: true },
  });

  const presentToday = todayAttendanceRecords.filter((r) => r.status === "Present").length;
  const lateToday = todayAttendanceRecords.filter((r) => r.status === "Late").length;
  const absentToday = todayAttendanceRecords.filter((r) => r.status === "Absent").length;
  const todayDenom = presentToday + lateToday + absentToday;
  const todayPercentage = todayDenom > 0 ? (((presentToday + lateToday) / todayDenom) * 100).toFixed(0) + "%" : "86%";

  const allFeePlans = await db.feePlan.findMany({
    where: { institute_id: institute.id },
    select: { balance: true },
  });
  const totalPendingFees = allFeePlans.reduce((acc, p) => acc + p.balance, 0);

  const pendingTasksCount = await db.studentTask.count({
    where: { institute_id: institute.id, status: { in: ["Pending", "In Progress"] } },
  });

  // Today's Classes Query
  const todaysClasses = await db.class.findMany({
    where: {
      institute_id: institute.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    include: {
      batch: { select: { name: true } },
      mentor: { select: { name: true } },
    },
    orderBy: { start_time: "asc" },
  });

  // Needs Attention Counts
  const allStudents = await db.student.findMany({
    where: { institute_id: institute.id, is_archived: false },
    include: { attendance_records: { select: { status: true } } },
  });

  let lowAttendanceCount = 0;
  allStudents.forEach((st) => {
    const p = st.attendance_records.filter((r) => r.status === "Present").length;
    const l = st.attendance_records.filter((r) => r.status === "Late").length;
    const a = st.attendance_records.filter((r) => r.status === "Absent").length;
    const den = p + l + a;
    if (den > 0 && ((p + l) / den) * 100 < 75) lowAttendanceCount++;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center gap-2">
        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Welcome to 👋</p>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          {institute.name}
        </h1>
      </div>

      <PortalQuickShareCard customDomain={institute.website} />

      {/* Main Summary: 4 Clear Cards (Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">{totalStudents}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">{todayPercentage}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Fees</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1 font-mono">
              {formatCurrency(totalPendingFees)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Tasks</p>
            <p className="text-3xl font-extrabold text-purple-600 mt-1 font-mono">{pendingTasksCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2 Main Panels: Today's Classes & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Classes */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" /> Today's Classes
            </h3>
            <Link href="/dashboard/classes" className="text-xs font-bold text-brand-600 hover:underline">
              View All &rarr;
            </Link>
          </div>

          {todaysClasses.length > 0 ? (
            <div className="space-y-3">
              {todaysClasses.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      Batch: <strong className="text-slate-800">{item.batch.name}</strong> • Mentor:{" "}
                      <strong className="text-slate-800">{item.mentor?.name || "Staff"}</strong>
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-brand-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                    {item.start_time || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400">
              No classes scheduled for today.
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">Needs Attention</h3>
          </div>

          <div className="space-y-3 text-xs">
            <Link
              href="/dashboard/reports/attendance"
              className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 block font-semibold flex items-center justify-between"
            >
              <span>⚠️ Low Attendance (&lt;75%)</span>
              <span className="font-bold font-mono">{lowAttendanceCount}</span>
            </Link>

            <Link
              href="/dashboard/reports/finance"
              className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 block font-semibold flex items-center justify-between"
            >
              <span>🔴 Overdue Fees</span>
              <span className="font-bold font-mono">${totalPendingFees.toFixed(0)}</span>
            </Link>

            <Link
              href="/dashboard/reports/staff-tasks"
              className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-900 block font-semibold flex items-center justify-between"
            >
              <span>📋 Overdue Tasks</span>
              <span className="font-bold font-mono">{pendingTasksCount}</span>
            </Link>

            <Link
              href="/dashboard/students?tab=admissions"
              className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 block font-semibold flex items-center justify-between"
            >
              <span>📞 Today's Follow-ups</span>
              <span className="font-bold font-mono">0</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
