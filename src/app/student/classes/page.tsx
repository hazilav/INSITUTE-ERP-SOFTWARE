import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import Link from "next/link";
import { GraduationCap, MapPin, Link2, Video, Clock } from "lucide-react";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  let classesList: any[] = [];

  if (student.batch_id) {
    classesList = await db.class.findMany({
      where: {
        institute_id: institute.id,
        batch_id: student.batch_id,
      },
      include: {
        mentor: { select: { name: true } },
        roomItem: { select: { name: true, room_number: true } },
      },
      orderBy: [{ date: "asc" }, { start_time: "asc" }],
    });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const todayClasses = classesList.filter(
    (c) => new Date(c.date).toISOString().slice(0, 10) === todayStr
  );

  const upcomingClasses = classesList.filter(
    (c) => new Date(c.date).toISOString().slice(0, 10) > todayStr
  );

  const renderClassCard = (c: any) => {
    const isCancelled = c.status === "Cancelled";
    return (
      <div
        key={c.id}
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isCancelled
            ? "bg-rose-50/60 border-rose-200"
            : c.class_type === "hybrid"
            ? "bg-emerald-50/40 border-emerald-200"
            : c.class_type === "live_online"
            ? "bg-purple-50/40 border-purple-200"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">{c.title}</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                isCancelled
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : c.class_type === "hybrid"
                  ? "bg-emerald-100 text-emerald-800"
                  : c.class_type === "live_online"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {isCancelled ? "Cancelled" : c.class_type === "physical" ? "Offline" : c.class_type === "live_online" ? "Online" : "Hybrid"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Date: <strong className="text-slate-800">{new Date(c.date).toLocaleDateString()}</strong> • Mentor:{" "}
            <strong className="text-slate-800">{c.mentor?.name || "Instructor"}</strong>
          </p>
          {isCancelled && c.cancellation_reason && (
            <p className="text-xs font-bold text-rose-600">Reason: {c.cancellation_reason}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="font-mono text-slate-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {c.start_time || "—"} – {c.end_time || "—"}
          </span>

          {!isCancelled && (
            <>
              {(c.class_type === "physical" || c.class_type === "hybrid") && (
                <span className="text-blue-800 font-bold bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {c.class_type === "hybrid" ? "Attend in" : ""} Room {c.roomItem?.room_number || c.room || "Main Room"}
                </span>
              )}

              {(c.class_type === "live_online" || c.class_type === "hybrid") && (
                c.meeting_link ? (
                  <a
                    href={c.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white font-bold bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-xl shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Join Online ({c.meeting_platform || "Meeting"})
                  </a>
                ) : (
                  <span className="text-purple-700 font-semibold bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                    Live Online Link Pending
                  </span>
                )
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Timetable & Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Authorized class sessions for your batch ({student.batch?.name || "General Batch"})
          </p>
        </div>

        {/* Today's Classes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" /> Today's Classes ({todayClasses.length})
          </h3>
          {todayClasses.length > 0 ? (
            <div className="space-y-3">{todayClasses.map(renderClassCard)}</div>
          ) : (
            <p className="text-xs text-slate-400 italic">No classes scheduled for today.</p>
          )}
        </div>

        {/* Upcoming Classes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-base">Upcoming Classes ({upcomingClasses.length})</h3>
          {upcomingClasses.length > 0 ? (
            <div className="space-y-3">{upcomingClasses.map(renderClassCard)}</div>
          ) : (
            <p className="text-xs text-slate-400 italic">No upcoming classes scheduled.</p>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
