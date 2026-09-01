import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";
import { FileText, Download, Eye, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentMyDocumentsPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const documents = await db.studentDocument.findMany({
    where: {
      institute_id: institute.id,
      student_id: student.id,
      visible_to_student: true,
    },
    orderBy: { created_at: "desc" },
  });

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Documents
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Official institute documents issued and shared with you
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" /> Documents ({documents.length})
          </h3>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-sm block">{d.document_name}</span>
                    <span className="text-xs text-slate-500 font-semibold">{d.document_type}</span>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      Uploaded: {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> View File
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              No documents currently shared with your student account.
            </div>
          )}
        </div>
      </div>
    </StudentPortalWrapper>
  );
}
