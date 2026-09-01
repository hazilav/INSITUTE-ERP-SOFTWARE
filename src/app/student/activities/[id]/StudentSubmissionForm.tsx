"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface StudentSubmissionFormProps {
  activityId: string;
  existingSubmission: {
    id: string;
    submission_text?: string | null;
    file_url?: string | null;
    status: string;
    submitted_at: string;
  } | null;
}

export default function StudentSubmissionForm({
  activityId,
  existingSubmission,
}: StudentSubmissionFormProps) {
  const router = useRouter();
  const [submissionText, setSubmissionText] = useState(
    existingSubmission?.submission_text || ""
  );
  const [fileUrl, setFileUrl] = useState(existingSubmission?.file_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/student/activities/${activityId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_text: submissionText,
          file_url: fileUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit coursework");

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred during submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-600" />
        {existingSubmission ? "Your Submission Record" : "Submit Your Response"}
      </h3>

      {existingSubmission && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <span className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" /> Status: {existingSubmission.status}
          </span>
          <span className="font-mono text-slate-500">
            Submitted on {new Date(existingSubmission.submitted_at).toLocaleString()}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Response submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Written Response / Answer Notes
          </label>
          <textarea
            rows={4}
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Type your coursework answer or notes here..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Attachment / Drive Link (Optional)
          </label>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{existingSubmission ? "Update Submission" : "Submit Coursework"}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
