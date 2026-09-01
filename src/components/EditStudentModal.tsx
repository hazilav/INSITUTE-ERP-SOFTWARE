"use client";

import { useState, useEffect } from "react";
import { X, User, Phone, Mail, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import Modal from "./Modal";

interface OptionItem {
  id: string;
  name: string;
  code?: string | null;
}

interface EditStudentModalProps {
  student: {
    id: string;
    student_code: string;
    name: string;
    photo?: string | null;
    phone: string;
    email?: string | null;
    dob?: string | null;
    gender?: string | null;
    address?: string | null;
    parent_name?: string | null;
    parent_phone?: string | null;
    learning_mode: string;
    status: string;
    course_id?: string | null;
    batch_id?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const [name, setName] = useState(student.name);
  const [photo, setPhoto] = useState(student.photo || "");
  const [phone, setPhone] = useState(student.phone);
  const [email, setEmail] = useState(student.email || "");
  const [dob, setDob] = useState(
    student.dob ? new Date(student.dob).toISOString().split("T")[0] : ""
  );
  const [gender, setGender] = useState(student.gender || "Male");
  const [address, setAddress] = useState(student.address || "");
  const [parentName, setParentName] = useState(student.parent_name || "");
  const [parentPhone, setParentPhone] = useState(student.parent_phone || "");
  const [learningMode, setLearningMode] = useState(student.learning_mode);
  const [status, setStatus] = useState(student.status);

  // Course & Batch dropdowns
  const [courseId, setCourseId] = useState(student.course_id || "");
  const [batchId, setBatchId] = useState(student.batch_id || "");
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) setCourses(d.courses);
        })
        .catch((e) => console.error(e));

      fetch("/api/batches")
        .then((r) => r.json())
        .then((d) => {
          if (d.batches) setBatches(d.batches);
        })
        .catch((e) => console.error(e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photo,
          phone,
          email,
          dob,
          gender,
          address,
          parent_name: parentName,
          parent_phone: parentPhone,
          learning_mode: learningMode,
          status,
          course_id: courseId || null,
          batch_id: batchId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update student record");
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
      title="Edit Student Record"
      subtitle={`Student ID: ${student.student_code}`}
      icon={<User className="w-5 h-5 text-blue-600" />}
      maxWidth="2xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      }
    >
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Academic & Course/Batch Selection
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">No Course Assigned</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">No Batch Assigned</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.code ? `(${b.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Learning Mode
              </label>
              <select
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white capitalize"
              >
                <option value="offline">🏫 Offline</option>
                <option value="online">🌐 Online</option>
                <option value="hybrid">🔄 Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
