import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Layers,
  Users,
  Clock,
  ArrowLeft,
  Lock,
  Calendar,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface CourseProfilePageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function CourseProfilePage({
  params,
  searchParams,
}: CourseProfilePageProps) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;

  if (user.role === "STUDENT") redirect("/dashboard");

  const course = await db.course.findFirst({
    where: { id: params.id, institute_id: institute.id },
    include: {
      batches: {
        where: { is_archived: false },
        include: {
          _count: { select: { students: { where: { is_archived: false } } } },
        },
      },
      _count: {
        select: {
          batches: { where: { is_archived: false } },
          students: { where: { is_archived: false } },
        },
      },
    },
  });

  if (!course) notFound();

  const activeTab = searchParams.tab || "overview";

  const tabs = [
    { id: "overview", label: "Overview", functional: true },
    { id: "modules", label: "Modules", functional: false },
    { id: "classes", label: "Classes", functional: false },
    { id: "activities", label: "Activities", functional: false },
    { id: "assessments", label: "Assessments", functional: false },
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

  const modeBadge = getModeBadge(course.learning_mode);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/courses" className="hover:text-slate-700">Courses</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{course.name}</span>
      </nav>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {course.name}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {course.status}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${modeBadge.style}`}>
                {modeBadge.label}
              </span>
            </div>

            <p className="text-sm font-mono font-bold text-brand-600">
              Code: {course.code || "N/A"}
            </p>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              {course.description || "No course description provided."}
            </p>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
            <div className="text-center px-2">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Batches</span>
              <span className="text-xl font-bold text-slate-900">{course._count.batches}</span>
            </div>
            <div className="w-[1px] bg-slate-200" />
            <div className="text-center px-2">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Enrolled Students</span>
              <span className="text-xl font-bold text-slate-900">{course._count.students}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Duration: <strong className="text-slate-800">{course.duration || "N/A"}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" /> Institute: <strong className="text-slate-800">{institute.name}</strong>
          </span>
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
                href={`/dashboard/courses/${course.id}?tab=${tab.id}`}
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
      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Associated Course Batches ({course.batches.length})</h3>
              </div>

              <Link
                href="/dashboard/batches"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Manage Batches &rarr;
              </Link>
            </div>

            {course.batches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {course.batches.map((batch) => (
                  <div key={batch.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{batch.name}</h4>
                      <span className="text-[11px] font-mono font-bold text-brand-600">{batch.code || "—"}</span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Mode: <strong className="capitalize text-slate-700">{batch.learning_mode}</strong></p>
                      {batch.classroom && <p>Room: <strong className="text-slate-700">{batch.classroom}</strong></p>}
                      <p>Enrolled Students: <strong className="text-slate-900">{batch._count.students}</strong></p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        View Batch Overview &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No active batches associated with this course yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 capitalize">{activeTab} Module</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This module section will be enabled when the {activeTab} engine is built in subsequent sections.
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
            Coming soon
          </span>
        </div>
      )}
    </div>
  );
}
