import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Layers,
  ChevronRight,
  BookOpen,
  Users,
  Clock,
  MapPin,
  Lock,
  Calendar,
  Building2,
  CalendarCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  FileCheck,
  FileBarChart,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface BatchProfilePageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function BatchProfilePage({
  params,
  searchParams,
}: BatchProfilePageProps) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;

  if (user.role === "STUDENT") redirect("/dashboard");

  const batch = await db.batch.findFirst({
    where: { id: params.id, institute_id: institute.id },
    include: {
      course: {
        select: { id: true, name: true, code: true, learning_mode: true },
      },
      primary_mentor: {
        select: { id: true, name: true, email: true, phone: true },
      },
      students: {
        where: { is_archived: false },
        select: {
          id: true,
          student_code: true,
          name: true,
          phone: true,
          email: true,
          photo: true,
          status: true,
          learning_mode: true,
          attendance_records: {
            select: { status: true, date: true },
          },
        },
      },
      _count: {
        select: {
          students: { where: { is_archived: false } },
        },
      },
    },
  });

  if (!batch) notFound();

  const activeTab = searchParams.tab || "overview";

  // Batch Assessments & Results Data
  const batchAssessments = await db.assessment.findMany({
    where: {
      institute_id: institute.id,
      batch_id: batch.id,
    },
    include: {
      results: {
        select: {
          obtained_marks: true,
          percentage: true,
          is_pass: true,
          result_status: true,
        },
      },
      _count: { select: { results: true } },
    },
    orderBy: { assessment_date: "desc" },
  });

  const allBatchResults = await db.assessmentResult.findMany({
    where: {
      institute_id: institute.id,
      assessment: { batch_id: batch.id },
    },
    select: { percentage: true, is_pass: true, result_status: true },
  });

  const totalBatchPctSum = allBatchResults.reduce((acc, r) => acc + r.percentage, 0);
  const overallBatchAvgPct =
    allBatchResults.length > 0
      ? (totalBatchPctSum / allBatchResults.length).toFixed(2) + "%"
      : "0.00%";

  const highestBatchPct =
    allBatchResults.length > 0
      ? Math.max(...allBatchResults.map((r) => r.percentage)).toFixed(2) + "%"
      : "0.00%";

  const lowestBatchPct =
    allBatchResults.length > 0
      ? Math.min(...allBatchResults.map((r) => r.percentage)).toFixed(2) + "%"
      : "0.00%";

  const batchPassCount = allBatchResults.filter((r) => r.is_pass).length;
  const batchFailCount = allBatchResults.filter((r) => !r.is_pass).length;
  const batchPendingEvalsCount = batchAssessments.filter(
    (a) => a.status === "Scheduled" || a.status === "Evaluation Pending"
  ).length;

  // Batch Activities Data
  const now = new Date();
  const batchActivities = await db.activity.findMany({
    where: {
      institute_id: institute.id,
      batch_id: batch.id,
    },
    include: {
      submissions: { select: { status: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { due_date: "asc" },
  });

  const activeBatchActivitiesCount = batchActivities.filter((a) => a.status === "Published").length;
  const completedBatchActivitiesCount = batchActivities.filter((a) => a.status === "Closed").length;
  const overdueBatchActivitiesCount = batchActivities.filter(
    (a) => a.status === "Published" && new Date(a.due_date) < now
  ).length;

  let pendingBatchReviewsCount = 0;
  batchActivities.forEach((a) => {
    a.submissions.forEach((s) => {
      if (["Submitted", "Late", "Under Review"].includes(s.status)) pendingBatchReviewsCount++;
    });
  });

  // Batch Attendance Summary Calculations
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const todayBatchAttendance = await db.attendanceRecord.findMany({
    where: {
      institute_id: institute.id,
      batch_id: batch.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    select: { status: true },
  });

  const presentToday = todayBatchAttendance.filter((r) => r.status === "Present").length;
  const absentToday = todayBatchAttendance.filter((r) => r.status === "Absent").length;

  // Overall Batch Attendance Percentage & Students Below 75% Threshold
  let totalBatchPresent = 0;
  let totalBatchLate = 0;
  let totalBatchAbsent = 0;
  const lowAttendanceStudents: any[] = [];

  batch.students.forEach((st) => {
    const p = st.attendance_records.filter((r) => r.status === "Present").length;
    const l = st.attendance_records.filter((r) => r.status === "Late").length;
    const a = st.attendance_records.filter((r) => r.status === "Absent").length;

    totalBatchPresent += p;
    totalBatchLate += l;
    totalBatchAbsent += a;

    const den = p + l + a;
    if (den > 0) {
      const pct = ((p + l) / den) * 100;
      if (pct < 75) {
        lowAttendanceStudents.push({
          ...st,
          percentage: pct.toFixed(2),
        });
      }
    }
  });

  const overallDenom = totalBatchPresent + totalBatchLate + totalBatchAbsent;
  const overallBatchPercentage =
    overallDenom > 0
      ? (((totalBatchPresent + totalBatchLate) / overallDenom) * 100).toFixed(2) + "%"
      : "0.00%";

  const tabs = [
    { id: "overview", label: "Overview", functional: true },
    { id: "students", label: "Enrolled Students", functional: true },
    { id: "attendance", label: "Attendance Summary", functional: true },
    { id: "activities", label: "Activities", functional: true },
    { id: "marks", label: "Marks & Results", functional: true },
    { id: "classes", label: "Classes", functional: false },
    { id: "fees", label: "Fees", functional: false },
  ];

  const getModeBadge = (m: string) => {
    switch (m) {
      case "offline":
        return { label: "🏫 Offline Mode", style: "bg-blue-100 text-blue-800 border-blue-200" };
      case "online":
        return { label: "🌐 Online Mode", style: "bg-purple-100 text-purple-800 border-purple-200" };
      case "hybrid":
        return { label: "🔄 Hybrid Mode", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "🔄 Hybrid Mode", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
  };

  const modeBadge = getModeBadge(batch.learning_mode);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/batches" className="hover:text-slate-700">Batches</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{batch.name}</span>
      </nav>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {batch.name}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {batch.status}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${modeBadge.style}`}>
                {modeBadge.label}
              </span>
            </div>

            <p className="text-sm font-mono font-bold text-brand-600 flex flex-wrap items-center gap-2">
              <span>Batch Code: {batch.code || "N/A"}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700">Parent Course: {batch.course.name}</span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-700 font-semibold">
                Mentor: {batch.primary_mentor?.name || "Unassigned"}
              </span>
            </p>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center shrink-0">
            <div className="px-2">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Students</span>
              <span className="text-2xl font-bold text-slate-900">{batch._count.students}</span>
            </div>
            <div className="w-[1px] bg-slate-200" />
            <div className="px-2">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Attendance</span>
              <span className="text-2xl font-bold text-brand-600 font-mono">{overallBatchPercentage}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" /> Start Date: <strong className="text-slate-800">{batch.start_date ? new Date(batch.start_date).toLocaleDateString() : "N/A"}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Schedule: <strong className="text-slate-800">{batch.days || "N/A"} ({batch.start_time || ""} – {batch.end_time || ""})</strong>
          </span>
          {batch.classroom && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" /> Room / Classroom: <strong className="text-slate-800">{batch.classroom}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/dashboard/batches/${batch.id}?tab=${tab.id}`}
                className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {!tab.functional && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-400">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Enrolled Students ({batch.students.length})</h3>
              </div>
              <Link href="/dashboard/students" className="text-xs font-semibold text-brand-600 hover:underline">
                Manage Students &rarr;
              </Link>
            </div>

            {batch.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {batch.students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-brand-600 text-xs">{st.student_code}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 text-xs">{st.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{st.phone}</td>
                        <td className="px-4 py-3 text-xs capitalize">{st.learning_mode}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {st.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/students/${st.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No students enrolled in this batch yet. Assign students via Student Data Center.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Marks & Results Tab Content */}
      {activeTab === "marks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch Average %</p>
                <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{overallBatchAvgPct}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Score</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{highestBatchPct}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lowest Score</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{lowestBatchPct}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass / Fail</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                  {batchPassCount} P / {batchFailCount} F
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Evals</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{batchPendingEvalsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <FileBarChart className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Batch Assessments & Results ({batchAssessments.length})</h3>
              </div>
              <Link href="/dashboard/marks" className="text-xs font-semibold text-brand-600 hover:underline">
                Create Assessment &rarr;
              </Link>
            </div>

            {batchAssessments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Assessment Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Max Marks</th>
                      <th className="px-4 py-3 text-center">Evaluated</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {batchAssessments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-900">{a.name}</td>
                        <td className="px-4 py-3">{a.type}</td>
                        <td className="px-4 py-3 font-mono">{new Date(a.assessment_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center font-mono">{a.maximum_marks}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-brand-600">{a.results.length}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/marks/${a.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                            Enter Marks
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No assessments scheduled for this batch yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities Tab Content */}
      {activeTab === "activities" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Published</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{activeBatchActivitiesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">{completedBatchActivitiesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Reviews</p>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{pendingBatchReviewsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{overdueBatchActivitiesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Batch Coursework Activities ({batchActivities.length})</h3>
              </div>
              <Link href="/dashboard/activities" className="text-xs font-semibold text-brand-600 hover:underline">
                Create Activity &rarr;
              </Link>
            </div>

            {batchActivities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Activity Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Max Marks</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {batchActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-900">{act.title}</td>
                        <td className="px-4 py-3">{act.activity_type}</td>
                        <td className="px-4 py-3 font-mono">{new Date(act.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono">{act.maximum_marks} pts</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {act.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/activities/${act.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                            View Roster
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No activities created for this batch yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Summary Tab Content */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Batch Attendance %</p>
                <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{overallBatchPercentage}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{presentToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent Today</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{absentToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Below 75%</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{lowAttendanceStudents.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">Enrolled Students ({batch.students.length})</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {batch.students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600 text-xs">{st.student_code}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 text-xs">{st.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{st.phone}</td>
                    <td className="px-4 py-3 text-xs capitalize">{st.learning_mode}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {st.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/students/${st.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
