"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive Student Record"
      subtitle={`Student Code: ${student.student_code}`}
      icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
      maxWidth="md"
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Yes, Archive Student"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Are you sure you want to archive <strong className="text-slate-900">{student.name}</strong> (
          <code className="text-amber-700 font-mono text-xs">{student.student_code}</code>)?
        </p>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
          Archiving removes the student from the active list and deactivates their login account while preserving all historical records in the database.
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
