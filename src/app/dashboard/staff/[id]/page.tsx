import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ShieldCheck,
  Building2,
  BookOpen,
  Layers,
  GraduationCap,
  ClipboardList,
  FileBarChart,
  UserX,
  Clock,
  Lock,
  Edit,
  Sparkles,
} from "lucide-react";
import StaffAccountCardClient from "./StaffAccountCardClient";

export const dynamic = "force-dynamic";

interface StaffProfilePageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function StaffProfilePage({
  params,
  searchParams,
}: StaffProfilePageProps) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;

  if (user.role === "STUDENT") redirect("/dashboard");

  const staff = await db.staffProfile.findFirst({
    where: { id: params.id, institute_id: institute.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          must_change_password: true,
          updated_at: true,
          last_login: true,
        },
      },
    },
  });

  if (!staff) notFound();

  const activeTab = searchParams.tab || "overview";

  let assignedBatches: any[] = [];
  let classesTaught: any[] = [];
  let activitiesCreated: any[] = [];
  let assessmentsEvaluated: any[] = [];

  if (staff.user_id) {
    assignedBatches = await db.batch.findMany({
      where: { institute_id: institute.id, primary_mentor_id: staff.user_id, is_archived: false },
      include: { course: { select: { name: true } }, _count: { select: { students: true } } },
    });

    classesTaught = await db.class.findMany({
      where: { institute_id: institute.id, mentor_id: staff.user_id },
      include: { batch: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 10,
    });

    activitiesCreated = await db.activity.findMany({
      where: { institute_id: institute.id, mentor_id: staff.user_id },
      include: { batch: { select: { name: true } } },
      orderBy: { due_date: "desc" },
      take: 10,
    });

    assessmentsEvaluated = await db.assessment.findMany({
      where: { institute_id: institute.id, mentor_id: staff.user_id },
      include: { batch: { select: { name: true } } },
      orderBy: { assessment_date: "desc" },
      take: 10,
    });
  }

  const tabs = [
    { id: "overview", label: "Overview", functional: true },
    { id: "batches", label: "Assigned Batches", functional: true },
    { id: "classes", label: "Classes", functional: true },
    { id: "activities", label: "Activities", functional: true },
    { id: "assessments", label: "Assessments", functional: true },
    { id: "tasks", label: "Tasks", functional: false },
  ];

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MENTOR":
        return "bg-brand-100 text-brand-800 border-brand-200";
      case "STAFF":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "On Leave":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Inactive":
      case "Resigned":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const initials = staff.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">People</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/staff" className="hover:text-slate-700">Staff & Mentors</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{staff.name}</span>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Staff & Mentors List
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {staff.photo ? (
            <img
              src={staff.photo}
              alt={staff.name}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {initials}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {staff.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getRoleBadgeStyle(staff.role)}`}>
                {staff.role}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getStatusBadgeStyle(staff.status)}`}>
                {staff.status}
              </span>
            </div>

            <p className="text-sm font-mono font-bold text-brand-600 flex items-center gap-2">
              <span>Employee ID: {staff.employee_id}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-normal text-slate-500">{staff.designation} ({staff.department})</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {staff.phone}
              </span>
              {staff.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {staff.email}
                </span>
              )}
            </div>
          </div>
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
                href={`/dashboard/staff/${staff.id}?tab=${tab.id}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">Personal & Contact Info</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Full Name</span>
                <span className="font-bold text-slate-900">{staff.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Employee ID</span>
                <span className="font-mono font-bold text-brand-600">{staff.employee_id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Phone</span>
                <span className="font-mono text-slate-800">{staff.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Email</span>
                <span>{staff.email || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Address</span>
                <span>{staff.address || "Not specified"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Employment & Account Details</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Department</span>
                  <span className="font-bold text-slate-900">{staff.department}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Designation</span>
                  <span className="font-bold text-slate-900">{staff.designation}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">System Role</span>
                  <span className="font-bold text-purple-600 font-mono">{staff.role}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Portal Account</span>
                  <span className="font-semibold text-slate-800">
                    {staff.user ? `Active (${staff.user.email})` : "No account generated"}
                  </span>
                </div>
                {staff.user?.last_login && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Last Login</span>
                    <span className="font-mono text-xs">{new Date(staff.user.last_login).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Staff Account & Portal Card */}
            {staff.user && (
              <StaffAccountCardClient
                staffId={staff.id}
                staffName={staff.name}
                userAccount={staff.user}
                canManage={user.role === "OWNER" || user.role === "ADMIN"}
              />
            )}
          </div>
        </div>
      )}

      {/* Assigned Batches Tab */}
      {activeTab === "batches" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">Mentored Batches ({assignedBatches.length})</h3>
            </div>
          </div>

          {assignedBatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Batch Name</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3 text-center">Students</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {assignedBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{b.name}</td>
                      <td className="px-4 py-3">{b.course.name}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{b._count.students}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/batches/${b.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                          View Batch &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No batches assigned to this mentor yet.
            </div>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === "classes" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Mentored Classes ({classesTaught.length})</h3>
            </div>
          </div>

          {classesTaught.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Class Title</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {classesTaught.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{c.title}</td>
                      <td className="px-4 py-3">{c.batch.name}</td>
                      <td className="px-4 py-3 font-mono">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 capitalize">{c.class_type}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No classes assigned to this mentor yet.
            </div>
          )}
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === "activities" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Coursework Activities ({activitiesCreated.length})</h3>
            </div>
          </div>

          {activitiesCreated.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {activitiesCreated.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{act.title}</td>
                      <td className="px-4 py-3">{act.batch.name}</td>
                      <td className="px-4 py-3 font-mono">{new Date(act.due_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/activities/${act.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                          View Roster &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No coursework activities assigned to this mentor.
            </div>
          )}
        </div>
      )}

      {/* Assessments Tab */}
      {activeTab === "assessments" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <FileBarChart className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-base">Mentored Assessments ({assessmentsEvaluated.length})</h3>
            </div>
          </div>

          {assessmentsEvaluated.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Assessment Name</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {assessmentsEvaluated.map((ass) => (
                    <tr key={ass.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{ass.name}</td>
                      <td className="px-4 py-3">{ass.batch.name}</td>
                      <td className="px-4 py-3 font-mono">{new Date(ass.assessment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/marks/${ass.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                          Enter Marks &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No exam assessments assigned to this mentor.
            </div>
          )}
        </div>
      )}

      {activeTab !== "overview" && activeTab !== "batches" && activeTab !== "classes" && activeTab !== "activities" && activeTab !== "assessments" && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 capitalize">{activeTab} Module</h3>
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
            Coming soon
          </span>
        </div>
      )}
    </div>
  );
}
