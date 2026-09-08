"use client";

import { useState, useEffect } from "react";
import { AlertCircle, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface FreezeStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: {
    id: string;
    name: string;
    student_code: string;
    status: string;
    freeze_reason?: string | null;
  } | null;
  action: "freeze" | "unfreeze";
}

export default function FreezeStudentModal({
  isOpen,
  onClose,
  onSuccess,
  student,
  action,
}: FreezeStudentModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${student.id}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "freeze" ? reason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} student`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `An error occurred while attempting to ${action} student.`);
    } finally {
      setLoading(false);
    }
  };

  const isFreeze = action === "freeze";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFreeze ? "Freeze Student?" : "Reactivate Student?"}
      subtitle={`${student.name} • ${student.student_code}`}
      icon={
        isFreeze ? (
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        )
      }
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
              isFreeze
                ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isFreeze ? "Freeze Student" : "Unfreeze Student"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {isFreeze ? (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              This will temporarily deactivate the student&apos;s account. The student&apos;s data will not be deleted.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold">What will happen:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>Student will be blocked from logging into the Student Portal.</li>
                <li>Any active student login sessions will be terminated immediately.</li>
                <li>All profile, attendance, tasks, activities, marks, fees, and recorded classes remain completely safe.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for freezing <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fee payment pending, temporary leave requested, disciplinary review..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              This will restore the student&apos;s portal access.
            </p>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <p className="font-bold">After unfreezing:</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                <li>Student status will return to <strong>ACTIVE</strong>.</li>
                <li>The student can log in using their existing Student ID and password.</li>
                <li>Access to classes, course material, marks, and recorded content will be restored immediately.</li>
              </ul>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
