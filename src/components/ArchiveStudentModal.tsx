"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface StudentRecord {
  id: string;
  student_code: string;
  name: string;
}

interface ArchiveStudentModalProps {
  student: StudentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArchiveStudentModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: ArchiveStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !student) return null;

  const handleArchive = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive student record");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900">Archive Student Record</h3>
        <p className="text-sm text-slate-600 mt-2">
          Are you sure you want to archive <strong className="text-slate-900">{student.name}</strong> (
          <code className="text-amber-700 font-mono text-xs">{student.student_code}</code>)?
        </p>

        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
          Archiving removes the student from the active list and deactivates their login account while preserving all historical records in the database.
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md shadow-amber-600/20 flex items-center justify-center transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Yes, Archive Student"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
