"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  BookOpen,
  Layers,
  Calendar,
  Award,
  CheckCircle2,
  FileCheck,
  UploadCloud,
  FileText,
  Edit,
  X,
  AlertCircle,
  ExternalLink,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";

interface RosterEntry {
  student: {
    id: string;
    student_code: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  submission?: {
    id: string;
    submission_type: string;
    submission_text?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    submitted_at: string;
    status: string;
    obtained_marks?: number | null;
    feedback?: string | null;
    notes?: string | null;
  } | null;
  status: string;
}

export default function ActivityDetailPage({ params }: { params: { id: string } }) {
  const [activity, setActivity] = useState<any>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [studentSelf, setStudentSelf] = useState<any>(null);
  const [studentSubmission, setStudentSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Offline Submission Modal State
  const [offlineModalStudent, setOfflineModalStudent] = useState<any>(null);
  const [offlineNotes, setOfflineNotes] = useState("Physical assignment received");
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);

  // Review Submission Modal State
  const [reviewEntry, setReviewEntry] = useState<RosterEntry | null>(null);
  const [obtainedMarks, setObtainedMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState("Reviewed");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Student Online Submission Form State
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activities/${params.id}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setActivity(data.activity);
        if (data.roster) setRoster(data.roster);
        if (data.student) setStudentSelf(data.student);
        if (data.submission) {
          setStudentSubmission(data.submission);
          setSubmissionText(data.submission.submission_text || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch activity details", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/activities/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchDetail();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleOfflineSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineModalStudent) return;
    setOfflineSubmitting(true);

    try {
      const res = await fetch(`/api/activities/${params.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: offlineModalStudent.id,
          submission_type: "offline",
          notes: offlineNotes,
        }),
      });

      if (res.ok) {
        setOfflineModalStudent(null);
        fetchDetail();
      }
    } catch (err) {
      console.error("Offline submission error", err);
    } finally {
      setOfflineSubmitting(false);
    }
  };

  const handleReviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEntry) return;
    setReviewSubmitting(true);

    try {
      const res = await fetch(`/api/activities/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: reviewEntry.submission?.id,
          student_id: reviewEntry.student.id,
          obtained_marks: obtainedMarks,
          feedback,
          status: reviewStatus,
        }),
      });

      if (res.ok) {
        setReviewEntry(null);
        fetchDetail();
      }
    } catch (err) {
      console.error("Review error", err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleStudentOnlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    setUploading(true);

    try {
      let fileUrl = studentSubmission?.file_url || null;
      let fileName = studentSubmission?.file_name || null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "File upload failed");

        fileUrl = uploadData.url;
        fileName = uploadData.fileName;
      }

      const res = await fetch(`/api/activities/${params.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_type: "online",
          submission_text: submissionText,
          file_url: fileUrl,
          file_name: fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit activity");

      setSubmitSuccess(true);
      fetchDetail();
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred during submission");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading activity details...</p>
      </div>
    );
  }

  if (!activity) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/activities" className="hover:text-slate-700">Activities</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{activity.title}</span>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/activities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Activities
        </Link>
      </div>

      {/* Header Specification Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activity.title}
              </h1>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                  activity.status === "Published"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {activity.status}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activity.activity_type}
              </span>
            </div>

            <p className="text-sm font-mono text-slate-500">
              {activity.module_name ? `Module: ${activity.module_name}` : "General Module"}
            </p>
          </div>

          {/* Quick Action Controls for Staff */}
          {!studentSelf && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStatusChange("Published")}
                disabled={activity.status === "Published"}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Publish
              </button>
              <button
                onClick={() => handleStatusChange("Closed")}
                disabled={activity.status === "Closed"}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => handleStatusChange("Archived")}
                disabled={activity.status === "Archived"}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-700">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-600" /> Parent Course
            </span>
            <p className="font-bold text-slate-900">{activity.course.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Target Batch
            </span>
            <p className="font-bold text-slate-900">{activity.batch.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Due Date
            </span>
            <p className="font-bold text-slate-900 font-mono">
              {new Date(activity.due_date).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" /> Maximum Marks
            </span>
            <p className="font-bold text-slate-900 font-mono">{activity.maximum_marks} pts</p>
          </div>
        </div>

        {activity.description && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Instructions & Guidelines
            </span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {activity.description}
            </p>
          </div>
        )}
      </div>

      {/* STUDENT SELF ONLINE SUBMISSION FORM */}
      {studentSelf && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <UploadCloud className="w-6 h-6 text-brand-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your Activity Submission</h3>
              <p className="text-xs text-slate-500">Upload your completed response file or text answer</p>
            </div>
          </div>

          {submitSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Submission successfully saved and timestamped!</span>
            </div>
          )}

          {submitError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {studentSubmission ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Submitted Status
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {studentSubmission.status}
                </span>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" /> Submitted on: {new Date(studentSubmission.submitted_at).toLocaleString()}
              </p>

              {studentSubmission.file_url && (
                <div className="pt-2">
                  <a
                    href={studentSubmission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-xs text-brand-600 hover:underline bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    <FileText className="w-4 h-4 text-brand-600" /> Download {studentSubmission.file_name || "Attachment"}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {studentSubmission.obtained_marks !== null && (
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mentor Review</span>
                  <p className="text-sm font-bold text-emerald-700">
                    Grade: {studentSubmission.obtained_marks} / {activity.maximum_marks} pts
                  </p>
                  {studentSubmission.feedback && (
                    <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                      "{studentSubmission.feedback}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleStudentOnlineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Text Response / Notes
                </label>
                <textarea
                  rows={3}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter online answer text or notes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Attachment File (PDF, DOCX, JPG, PNG, ZIP - Max 10MB)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Activity Response
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* STAFF / MENTOR BATCH SUBMISSIONS ROSTER */}
      {!studentSelf && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Student Submissions Roster ({roster.length})</h3>
              <p className="text-xs text-slate-500">Track and review student coursework submissions for this batch</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Submitted Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Marks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {roster.map((entry) => {
                  const sub = entry.submission;
                  return (
                    <tr key={entry.student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-xs">{entry.student.name}</p>
                        <span className="font-mono text-brand-600 text-[11px]">ID: {entry.student.student_code}</span>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {sub ? (
                          <span className="font-semibold text-slate-800 capitalize">
                            {sub.submission_type}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-mono">
                        {sub ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            entry.status === "Reviewed"
                              ? "bg-emerald-100 text-emerald-800"
                              : entry.status === "Late"
                              ? "bg-rose-100 text-rose-800"
                              : entry.status === "Submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-900 font-mono text-xs">
                        {sub?.obtained_marks !== null && sub?.obtained_marks !== undefined
                          ? `${sub.obtained_marks} / ${activity.maximum_marks}`
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Offline Receipt Button */}
                          {!sub && (
                            <button
                              onClick={() => setOfflineModalStudent(entry.student)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              Mark as Submitted
                            </button>
                          )}

                          {/* Review Button */}
                          {sub && (
                            <button
                              onClick={() => {
                                setReviewEntry(entry);
                                setObtainedMarks(sub.obtained_marks !== null ? String(sub.obtained_marks) : "");
                                setFeedback(sub.feedback || "");
                                setReviewStatus(sub.status === "Not Submitted" ? "Reviewed" : sub.status);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" /> Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offline Submission Modal */}
      {offlineModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setOfflineModalStudent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Record Offline Submission</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record physical assignment receipt for <strong className="text-slate-800">{offlineModalStudent.name}</strong>
            </p>

            <form onSubmit={handleOfflineSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Submission Notes
                </label>
                <input
                  type="text"
                  value={offlineNotes}
                  onChange={(e) => setOfflineNotes(e.target.value)}
                  placeholder="e.g. Physical hardcopy project received"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOfflineModalStudent(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offlineSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {offlineSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Mark as Submitted"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setReviewEntry(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Review Student Submission</h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: <strong className="text-slate-800">{reviewEntry.student.name}</strong> ({reviewEntry.student.student_code})
            </p>

            {/* Submission preview */}
            {reviewEntry.submission?.file_url && (
              <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Attachment File</span>
                <a
                  href={reviewEntry.submission.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  Open File <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {reviewEntry.submission?.submission_text && (
              <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-400 block mb-1">Student Answer</span>
                <p className="text-slate-800">{reviewEntry.submission.submission_text}</p>
              </div>
            )}

            <form onSubmit={handleReviewSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Obtained Marks (Max: {activity.maximum_marks})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    max={activity.maximum_marks}
                    value={obtainedMarks}
                    onChange={(e) => setObtainedMarks(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Review Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="Reviewed">Reviewed</option>
                    <option value="Needs Revision">Needs Revision</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mentor Feedback
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback for the student..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewEntry(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {reviewSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Review"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
