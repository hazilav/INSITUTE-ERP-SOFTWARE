import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import { PlayCircle, CheckCircle2, Clock } from "lucide-react";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentContentPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  if (institute.institute_mode === "offline") {
    redirect("/student/dashboard");
  }

  let recordedLessons: any[] = [];

  if (student.course_id) {
    recordedLessons = await db.recordedContent.findMany({
      where: {
        institute_id: institute.id,
        course_id: student.course_id,
        publish_status: "Published",
      },
      include: {
        progress: {
          where: { student_id: student.id },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Recorded Classes & Content
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Video lessons published for your course ({student.course?.name || "General Course"})
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          {recordedLessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recordedLessons.map((item) => {
                const status = item.progress[0]?.status || "Not Started";
                return (
                  <div key={item.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                          {item.module_name || "General Module"}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : status === "In Progress"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description || "No description provided."}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {item.duration || "Video Lesson"}
                      </span>
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" /> Watch Lesson
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              No published recorded classes available for your course yet.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
