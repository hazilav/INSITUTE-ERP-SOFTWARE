import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import { User, BookOpen, Users, Lock, Phone, Mail, MapPin } from "lucide-react";
import StudentPasswordForm from "./StudentPasswordForm";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <StudentPortalWrapper>
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Student Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Personal account details and security settings
          </p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex items-center gap-5">
          {student.photo ? (
            <img src={student.photo} alt={student.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {initials}
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{student.name}</h2>
            <p className="text-sm font-mono font-bold text-brand-600">
              Student ID: {student.student_code}
            </p>
            <p className="text-xs text-slate-500">{institute.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">Personal Information</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 uppercase font-semibold">Full Name</span>
                <span className="font-bold text-slate-900">{student.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 uppercase font-semibold">Phone</span>
                <span className="font-mono text-slate-800">{student.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 uppercase font-semibold">Email</span>
                <span>{student.email || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 uppercase font-semibold">Date of Birth</span>
                <span className="font-mono">{student.dob ? new Date(student.dob).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 uppercase font-semibold">Address</span>
                <span>{student.address || "Not specified"}</span>
              </div>
            </div>
          </div>

          {/* Academic & Parent Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Academic Details</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 uppercase font-semibold">Course</span>
                  <span className="font-bold text-slate-900">{student.course?.name || "General Course"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 uppercase font-semibold">Batch</span>
                  <span className="font-bold text-slate-900">{student.batch?.name || "General Batch"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 uppercase font-semibold">Learning Mode</span>
                  <span className="font-bold text-purple-600 capitalize">{student.learning_mode}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Parent / Guardian Info</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 uppercase font-semibold">Parent Name</span>
                  <span className="font-bold text-slate-900">{student.parent_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 uppercase font-semibold">Parent Phone</span>
                  <span className="font-mono text-slate-800">{student.parent_phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Component */}
        <StudentPasswordForm />
      </div>
    </StudentPortalWrapper>
  );
}
