"use client";

import { useState, useEffect } from "react";
import {
  X,
  ClipboardList,
  AlertCircle,
  BookOpen,
  Layers,
  Calendar,
  Sparkles,
} from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
  code?: string | null;
  course_id?: string;
}

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  instituteMode?: string;
  editingActivity?: any;
}

export default function CreateActivityModal({
  isOpen,
  onClose,
  onSuccess,
  instituteMode = "hybrid",
  editingActivity = null,
}: CreateActivityModalProps) {
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [activityType, setActivityType] = useState("Assignment");
  const [submissionType, setSubmissionType] = useState(
    instituteMode === "offline" ? "offline" : "online"
  );
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [gradingRequired, setGradingRequired] = useState(true);
  const [status, setStatus] = useState("Published");

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

      if (editingActivity) {
        setTitle(editingActivity.title);
        setDescription(editingActivity.description || "");
        setCourseId(editingActivity.course_id);
        setBatchId(editingActivity.batch_id);
        setModuleName(editingActivity.module_name || "");
        setActivityType(editingActivity.activity_type);
        setSubmissionType(editingActivity.submission_type);
        setAssignedDate(
          editingActivity.assigned_date
            ? new Date(editingActivity.assigned_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setDueDate(
          editingActivity.due_date
            ? new Date(editingActivity.due_date).toISOString().split("T")[0]
            : ""
        );
        setMaxMarks(String(editingActivity.maximum_marks || 100));
        setGradingRequired(editingActivity.grading_required !== false);
        setStatus(editingActivity.status);
      } else {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 7);
        setDueDate(defaultDue.toISOString().split("T")[0]);
      }
    }
  }, [isOpen, editingActivity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = editingActivity ? `/api/activities/${editingActivity.id}` : "/api/activities";
      const method = editingActivity ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          course_id: courseId,
          batch_id: batchId,
          module_name: moduleName,
          activity_type: activityType,
          submission_type: submissionType,
          assigned_date: assignedDate,
          due_date: dueDate,
          maximum_marks: parseFloat(maxMarks),
          grading_required: gradingRequired,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save activity");

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
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingActivity ? "Edit Activity" : "Create New Activity"}
            </h3>
            <p className="text-xs text-slate-500">Configure coursework assignment details and submission settings</p>
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
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-Term Project: Database Schema Design"
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
                Activity Type
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Assignment">Assignment</option>
                <option value="Project">Project</option>
                <option value="Quiz">Quiz</option>
                <option value="Practical">Practical</option>
                <option value="Homework">Homework</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Submission Method
              </label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                {instituteMode === "offline" && <option value="offline">Offline Submission</option>}
                {instituteMode === "online" && <option value="online">Online Upload/Text</option>}
                {instituteMode === "hybrid" && (
                  <>
                    <option value="online">Online Upload/Text</option>
                    <option value="offline">Offline Physical Receipt</option>
                    <option value="hybrid">Hybrid (Both Online & Offline)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Module / Topic
              </label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g. Unit 3: Normalization"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Date
              </label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Maximum Marks
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Publish Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Published">Published (Visible to Students)</option>
                <option value="Draft">Draft (Hidden)</option>
                <option value="Closed">Closed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gradingRequired}
                  onChange={(e) => setGradingRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-700">Requires Mentor Grading</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Instructions & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe assignment guidelines, submission requirements..."
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
              ) : editingActivity ? (
                "Save Changes"
              ) : (
                "Create Activity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
