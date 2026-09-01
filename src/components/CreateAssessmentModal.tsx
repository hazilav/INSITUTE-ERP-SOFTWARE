"use client";

import { useState, useEffect } from "react";
import {
  X,
  FileBarChart,
  AlertCircle,
  BookOpen,
  Layers,
  Calendar,
  Award,
} from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
  code?: string | null;
  course_id?: string;
}

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAssessment?: any;
}

export default function CreateAssessmentModal({
  isOpen,
  onClose,
  onSuccess,
  editingAssessment = null,
}: CreateAssessmentModalProps) {
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [type, setType] = useState("Exam");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [maxMarks, setMaxMarks] = useState("100");
  const [passingMarks, setPassingMarks] = useState("40");
  const [status, setStatus] = useState("Scheduled");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) {
            setCourses(d.courses);
            if (d.courses.length > 0 && !courseId) setCourseId(d.courses[0].id);
          }
        });

      fetch("/api/batches")
        .then((r) => r.json())
        .then((d) => {
          if (d.batches) setBatches(d.batches);
        });

      if (editingAssessment) {
        setName(editingAssessment.name);
        setDescription(editingAssessment.description || "");
        setCourseId(editingAssessment.course_id);
        setBatchId(editingAssessment.batch_id);
        setModuleName(editingAssessment.module_name || "");
        setType(editingAssessment.type);
        setAssessmentDate(
          editingAssessment.assessment_date
            ? new Date(editingAssessment.assessment_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setMaxMarks(String(editingAssessment.maximum_marks || 100));
        setPassingMarks(String(editingAssessment.passing_marks || 40));
        setStatus(editingAssessment.status);
      } else {
        setName("");
        setDescription("");
        setModuleName("");
        setType("Exam");
        setAssessmentDate(new Date().toISOString().split("T")[0]);
        setMaxMarks("100");
        setPassingMarks("40");
        setStatus("Scheduled");
      }
    }
  }, [isOpen, editingAssessment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = editingAssessment ? `/api/marks/${editingAssessment.id}` : "/api/marks";
      const method = editingAssessment ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          course_id: courseId,
          batch_id: batchId,
          module_name: moduleName,
          type,
          assessment_date: assessmentDate,
          maximum_marks: parseFloat(maxMarks),
          passing_marks: parseFloat(passingMarks),
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save assessment");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = courseId
    ? batches.filter((b) => b.course_id === courseId)
    : batches;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileBarChart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingAssessment ? "Edit Assessment" : "Create New Assessment"}
            </h3>
            <p className="text-xs text-slate-500">Configure exam parameters, maximum score, and passing criteria</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assessment Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Final Semester Examination - Batch 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parent Course <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  const matching = batches.filter((b) => b.course_id === e.target.value);
                  if (matching.length > 0) setBatchId(matching[0].id);
                  else setBatchId("");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Batch <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select batch...</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assessment Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Exam">Exam</option>
                <option value="Quiz">Quiz</option>
                <option value="Assignment">Assignment</option>
                <option value="Project">Project</option>
                <option value="Practical">Practical</option>
                <option value="Presentation">Presentation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assessment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Module / Topic
              </label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g. Unit 4: Algorithms"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Maximum Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Passing Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Evaluation Pending">Evaluation Pending</option>
                <option value="Completed">Completed</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assessment syllabus, exam room rules..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : editingAssessment ? (
                "Save Changes"
              ) : (
                "Create Assessment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
