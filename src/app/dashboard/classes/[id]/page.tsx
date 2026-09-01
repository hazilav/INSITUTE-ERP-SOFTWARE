import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  GraduationCap,
  ChevronRight,
  BookOpen,
  Layers,
  Clock,
  Calendar,
  User,
  MapPin,
  Link2,
  Video,
  ArrowLeft,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ClassDetailPageProps {
  params: { id: string };
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;

  const classItem = await db.class.findFirst({
    where: { id: params.id, institute_id: institute.id },
    include: {
      course: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true, code: true } },
      mentor: { select: { id: true, name: true, role: true, email: true } },
    },
  });

  if (!classItem) notFound();

  const getClassTypeBadge = (t: string) => {
    switch (t) {
      case "physical":
        return { label: "🏫 Physical Class", style: "bg-blue-100 text-blue-800 border-blue-200" };
      case "live_online":
        return { label: "🌐 Live Online Class", style: "bg-purple-100 text-purple-800 border-purple-200" };
      case "recorded":
        return { label: "🎥 Recorded Video Class", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "🏫 Physical Class", style: "bg-blue-100 text-blue-800 border-blue-200" };
    }
  };

  const modeBadge = getClassTypeBadge(classItem.class_type);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/classes" className="hover:text-slate-700">Classes</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{classItem.title}</span>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/classes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Classes
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {classItem.title}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {classItem.status}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${modeBadge.style}`}>
                {modeBadge.label}
              </span>
            </div>

            <p className="text-sm font-mono text-slate-500">
              {classItem.topic ? `Topic: ${classItem.topic}` : "No specific module topic assigned"}
            </p>
          </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-slate-700">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-600" /> Parent Course
            </span>
            <p className="font-bold text-slate-900">{classItem.course.name}</p>
            <p className="text-xs font-mono text-brand-600">{classItem.course.code || "—"}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Target Batch
            </span>
            <p className="font-bold text-slate-900">{classItem.batch.name}</p>
            <p className="text-xs font-mono text-purple-600">{classItem.batch.code || "—"}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Assigned Mentor
            </span>
            <p className="font-bold text-slate-900">{classItem.mentor?.name || "Staff Mentor"}</p>
            <p className="text-xs text-slate-500">{classItem.mentor?.role || "Staff"}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date & Schedule
            </span>
            <p className="font-bold text-slate-900">{new Date(classItem.date).toLocaleDateString()}</p>
            <p className="text-xs font-mono text-slate-600">{classItem.start_time} – {classItem.end_time}</p>
          </div>

          {/* Mode Specific Dynamic Output */}
          {classItem.class_type === "physical" && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
              <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Classroom Location
              </span>
              <p className="font-bold text-blue-950 text-base">{classItem.room || "Room 101"}</p>
              <p className="text-xs text-blue-700">Physical classroom allocation</p>
            </div>
          )}

          {classItem.class_type === "live_online" && (
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-xs text-purple-600 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-purple-600" /> Live Meeting Link
              </span>
              {classItem.meeting_link ? (
                <a
                  href={classItem.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-purple-700 text-sm underline truncate block"
                >
                  {classItem.meeting_link}
                </a>
              ) : (
                <p className="text-xs text-purple-500 font-mono">No meeting link provided</p>
              )}
            </div>
          )}

          {classItem.class_type === "recorded" && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
              <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-600" /> Content / Video URL
              </span>
              {classItem.content_url ? (
                <a
                  href={classItem.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 text-sm underline truncate block"
                >
                  {classItem.content_url}
                </a>
              ) : (
                <p className="text-xs text-emerald-500 font-mono">No video URL provided</p>
              )}
            </div>
          )}
        </div>

        {classItem.description && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Class Description & Notes
            </span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {classItem.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
