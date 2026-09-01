"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  FileBarChart,
  BookOpen,
  Layers,
  Calendar,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Save,
} from "lucide-react";
import { calculatePercentage, calculateGrade, determinePassStatus } from "@/lib/grading";

interface RosterEntry {
  student: {
    id: string;
    student_code: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  result?: {
    id: string;
    obtained_marks: number;
    percentage: number;
    grade: string;
    is_pass: boolean;
    result_status: string;
    feedback?: string | null;
  } | null;
  status: string;
}

export default function EnterMarksPage({ params }: { params: { id: string } }) {
  const [assessment, setAssessment] = useState<any>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [studentSelf, setStudentSelf] = useState<any>(null);
  const [studentResult, setStudentResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fast Batch Mark Entry Map State: { [studentId]: { obtained: string, feedback: string } }
  const [markMap, setMarkMap] = useState<Record<string, { obtained: string; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marks/${params.id}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setAssessment(data.assessment);
        if (data.roster) {
          setRoster(data.roster);

          // Populate initial markMap from existing results
          const initialMap: Record<string, { obtained: string; feedback: string }> = {};
          data.roster.forEach((r: RosterEntry) => {
            initialMap[r.student.id] = {
              obtained: r.result && r.result.obtained_marks !== null ? String(r.result.obtained_marks) : "",
              feedback: r.result?.feedback || "",
            };
          });
          setMarkMap(initialMap);
        }
        if (data.student) setStudentSelf(data.student);
        if (data.result) setStudentResult(data.result);
      }
    } catch (err) {
      console.error("Failed to fetch assessment details", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleMarkChange = (studentId: string, obtained: string) => {
    setMarkMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        obtained,
      },
    }));
  };

  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setMarkMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        feedback,
      },
    }));
  };

  const handleFinalizationAction = async (actionType: "finalize" | "reopen") => {
    setError("");
    try {
      const res = await fetch(`/api/marks/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update finalization status");
      fetchDetail();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Client-side validation: Check no mark exceeds maximum marks
    const studentResults: any[] = [];
    for (const r of roster) {
      const entry = markMap[r.student.id];
      if (entry && entry.obtained !== "" && entry.obtained !== undefined) {
        const val = parseFloat(entry.obtained);
        if (isNaN(val)) {
          setError(`Invalid mark for student ${r.student.name}`);
          return;
        }
        if (val > assessment.maximum_marks) {
          setError(`Obtained mark for ${r.student.name} (${val}) cannot exceed maximum marks (${assessment.maximum_marks}).`);
          return;
        }
        studentResults.push({
          student_id: r.student.id,
          obtained_marks: val,
          feedback: entry.feedback || "",
        });
      }
    }

    if (studentResults.length === 0) {
      setError("Please enter marks for at least one student.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/marks/${params.id}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_results: studentResults }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save marks");

      setSuccess(true);
      fetchDetail();
    } catch (err: any) {
      setError(err.message || "An error occurred during save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading assessment details...</p>
      </div>
    );
  }

  if (!assessment) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/marks" className="hover:text-slate-700">Marks & Results</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">{assessment.name}</span>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/marks"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assessments
        </Link>
      </div>

      {/* Header Specification Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {assessment.name}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                {assessment.type}
              </span>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                  assessment.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {assessment.status}
              </span>
              {assessment.finalized && (
                <span className="px-3 py-1 text-xs font-extrabold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  🔒 Finalized Results
                </span>
              )}
            </div>

            <p className="text-sm font-mono text-slate-500">
              {assessment.module_name ? `Module: ${assessment.module_name}` : "General Module"}
            </p>
          </div>

          {/* Quick Action Controls */}
          {!studentSelf && (
            <div className="flex items-center gap-2">
              {assessment.finalized ? (
                <button
                  onClick={() => handleFinalizationAction("reopen")}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" /> Reopen Results
                </button>
              ) : (
                <button
                  onClick={() => handleFinalizationAction("finalize")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Finalize Results
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-700">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand-600" /> Parent Course
            </span>
            <p className="font-bold text-slate-900">{assessment.course.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Target Batch
            </span>
            <p className="font-bold text-slate-900">{assessment.batch.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date
            </span>
            <p className="font-bold text-slate-900 font-mono">
              {new Date(assessment.assessment_date).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" /> Max / Passing Marks
            </span>
            <p className="font-bold text-slate-900 font-mono">
              {assessment.maximum_marks} pts (Pass: {assessment.passing_marks})
            </p>
          </div>
        </div>
      </div>

      {/* STUDENT SELF RESULT VIEW */}
      {studentSelf && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <Award className="w-6 h-6 text-brand-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your Assessment Result</h3>
              <p className="text-xs text-slate-500">Official marks and grade record for {assessment.name}</p>
            </div>
          </div>

          {studentResult ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Obtained Marks</span>
                <p className="text-2xl font-extrabold text-slate-900 font-mono">
                  {studentResult.obtained_marks} / {assessment.maximum_marks}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Percentage</span>
                <p className="text-2xl font-extrabold text-brand-600 font-mono">
                  {studentResult.percentage}%
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Grade</span>
                <p className="text-2xl font-extrabold text-purple-600 font-mono">
                  {studentResult.grade}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Result Status</span>
                <p
                  className={`text-xl font-extrabold ${
                    studentResult.is_pass ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {studentResult.is_pass ? "PASSED" : "FAILED"}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Your evaluation result for this assessment is pending.
            </div>
          )}
        </div>
      )}

      {/* STAFF / MENTOR FAST BATCH MARK ENTRY ROSTER */}
      {!studentSelf && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Enter Batch Student Marks ({roster.length})</h3>
              <p className="text-xs text-slate-500">
                Enter obtained scores. Percentages, Letter Grades, and Pass/Fail results calculate dynamically.
              </p>
            </div>

            <button
              onClick={handleSaveMarks}
              disabled={saving || assessment.finalized}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Batch Marks
                </>
              )}
            </button>
          </div>

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Student marks successfully updated and calculated!</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {assessment.finalized && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This assessment is finalized and locked from changes. Reopen assessment to edit marks.</span>
            </div>
          )}

          <form onSubmit={handleSaveMarks}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3 text-center">Max Marks</th>
                    <th className="px-4 py-3 text-center w-36">Obtained Marks</th>
                    <th className="px-4 py-3 text-center">Percentage</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-center">Result</th>
                    <th className="px-4 py-3">Feedback / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {roster.map((entry) => {
                    const studentId = entry.student.id;
                    const valStr = markMap[studentId]?.obtained ?? "";
                    const feedbackStr = markMap[studentId]?.feedback ?? "";

                    const numVal = parseFloat(valStr);
                    const hasValidMark = !isNaN(numVal) && valStr !== "";

                    const pct = hasValidMark
                      ? calculatePercentage(numVal, assessment.maximum_marks)
                      : null;
                    const grade = pct !== null ? calculateGrade(pct) : "—";
                    const isPass = hasValidMark
                      ? determinePassStatus(numVal, assessment.passing_marks)
                      : null;

                    return (
                      <tr key={studentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 text-xs block">{entry.student.name}</span>
                        </td>

                        <td className="px-4 py-3 font-mono text-brand-600 text-xs">
                          {entry.student.student_code}
                        </td>

                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 text-xs">
                          {assessment.maximum_marks}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={assessment.maximum_marks}
                            disabled={assessment.finalized}
                            value={valStr}
                            onChange={(e) => handleMarkChange(studentId, e.target.value)}
                            placeholder="Score"
                            className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white disabled:opacity-50"
                          />
                        </td>

                        <td className="px-4 py-3 text-center font-mono font-bold text-brand-600 text-xs">
                          {pct !== null ? `${pct}%` : "—"}
                        </td>

                        <td className="px-4 py-3 text-center font-mono font-bold text-purple-600 text-xs">
                          {grade}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isPass !== null ? (
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded ${
                                isPass
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {isPass ? "PASS" : "FAIL"}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="text"
                            disabled={assessment.finalized}
                            value={feedbackStr}
                            onChange={(e) => handleFeedbackChange(studentId, e.target.value)}
                            placeholder="e.g. Good analytical reasoning"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving || assessment.finalized}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Batch Marks
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
