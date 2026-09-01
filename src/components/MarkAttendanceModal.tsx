"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BookOpen,
  Layers,
  GraduationCap,
  Users,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
  code?: string | null;
  course_id?: string;
}

interface StudentItem {
  id: string;
  student_code: string;
  name: string;
  phone: string;
  status: string;
  learning_mode: string;
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
}: MarkAttendanceModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; remarks: string }>>({});
  const [classInfo, setClassInfo] = useState<any>(null);

  const [loadingContext, setLoadingContext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Load active courses & batches
      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) setCourses(d.courses);
        });

      fetch("/api/batches")
        .then((r) => r.json())
        .then((d) => {
          if (d.batches) setBatches(d.batches);
        });
    }
  }, [isOpen]);

  // Load classes when batch & date are selected
  useEffect(() => {
    if (selectedBatchId && date) {
      fetch(`/api/classes?batch_id=${selectedBatchId}&date=${date}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.classes) {
            const formatted = d.classes.map((c: any) => ({
              id: c.id,
              name: `${c.title} (${c.start_time || "Scheduled"})`,
            }));
            setClasses(formatted);
            if (formatted.length > 0) setSelectedClassId(formatted[0].id);
            else setSelectedClassId("");
          }
        });
    } else {
      setClasses([]);
      setSelectedClassId("");
    }
  }, [selectedBatchId, date]);

  // Load students & context when class & batch are selected
  useEffect(() => {
    if (selectedBatchId && selectedClassId) {
      setLoadingContext(true);
      setError("");

      fetch(`/api/attendance/mark-context?batch_id=${selectedBatchId}&class_id=${selectedClassId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setStudents(d.students || []);
            setClassInfo(d.classItem || null);

            // Populate initial attendance map (defaulting to Present or existing record)
            const map: Record<string, { status: string; remarks: string }> = {};
            const existingMap: Record<string, { status: string; remarks: string }> = {};

            if (d.existingRecords && Array.isArray(d.existingRecords)) {
              d.existingRecords.forEach((rec: any) => {
                existingMap[rec.student_id] = {
                  status: rec.status,
                  remarks: rec.remarks || "",
                };
              });
            }

            d.students.forEach((st: StudentItem) => {
              if (existingMap[st.id]) {
                map[st.id] = existingMap[st.id];
              } else {
                map[st.id] = { status: "Present", remarks: "" };
              }
            });

            setAttendanceMap(map);
          } else {
            setError(d.error || "Failed to load class context");
          }
        })
        .catch((err) => setError("Failed to fetch class context"))
        .finally(() => setLoadingContext(false));
    } else {
      setStudents([]);
      setAttendanceMap({});
      setClassInfo(null);
    }
  }, [selectedBatchId, selectedClassId]);

  if (!isOpen) return null;

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        updated[st.id] = {
          ...updated[st.id],
          status: "Present",
        };
      });
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedBatchId) {
      setError("Please select a valid Batch and Class.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const studentRecords = students.map((st) => ({
        student_id: st.id,
        status: attendanceMap[st.id]?.status || "Present",
        remarks: attendanceMap[st.id]?.remarks || "",
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClassId,
          batch_id: selectedBatchId,
          date,
          student_records: studentRecords,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to mark attendance");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const filteredBatches = selectedCourseId
    ? batches.filter((b) => b.course_id === selectedCourseId)
    : batches;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Mark Class Attendance</h3>
            <p className="text-xs text-slate-500">Record attendance for scheduled physical & live online classes</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Context Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  const matching = batches.filter((b) => b.course_id === e.target.value);
                  if (matching.length > 0) setSelectedBatchId(matching[0].id);
                  else setSelectedBatchId("");
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Batch
              </label>
              <select
                required
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select batch...</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Class Session
              </label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Info Banner */}
          {classInfo && (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between text-xs text-blue-900">
              <div>
                <span className="font-bold">{classInfo.title}</span> •{" "}
                <span className="capitalize">{classInfo.class_type.replace("_", " ")}</span>
                {classInfo.room && <span> • Room: {classInfo.room}</span>}
              </div>
              <span className="font-mono text-blue-700 font-semibold">
                Enrolled Students: {students.length}
              </span>
            </div>
          )}

          {/* Step 2: Student Attendance List */}
          {loadingContext ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading batch roster...</p>
            </div>
          ) : students.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Student Attendance Roster ({students.length})
                </span>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Mark All Present
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {students.map((st) => {
                  const currentStatus = attendanceMap[st.id]?.status || "Present";
                  return (
                    <div
                      key={st.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{st.name}</p>
                        <p className="text-[11px] font-mono text-brand-600">ID: {st.student_code}</p>
                      </div>

                      {/* Status Choices: Present, Absent, Late, Leave */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "Present")}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 ${
                            currentStatus === "Present"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🟢 Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "Absent")}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 ${
                            currentStatus === "Absent"
                              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🔴 Absent
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "Late")}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 ${
                            currentStatus === "Late"
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🟡 Late
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, "Leave")}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 ${
                            currentStatus === "Leave"
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🔵 Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedClassId ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No students enrolled in this batch yet.
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Select Date, Course, Batch, and Class to view roster.
            </div>
          )}

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
              disabled={saving || students.length === 0}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Save Attendance Records"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
