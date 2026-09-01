"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Download, Printer, Filter, Eye } from "lucide-react";
import { exportToCSV, printReport } from "@/lib/export";

interface StudentsReportClientProps {
  instituteName: string;
}

export default function StudentsReportClient({ instituteName }: StudentsReportClientProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, [courseFilter, batchFilter, statusFilter, modeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (courseFilter !== "ALL") params.append("course_id", courseFilter);
      if (batchFilter !== "ALL") params.append("batch_id", batchFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (modeFilter !== "ALL") params.append("mode", modeFilter);

      const res = await fetch(`/api/reports/students?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch student report", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    const filterDesc = `Course: ${courseFilter}, Batch: ${batchFilter}, Status: ${statusFilter}, Mode: ${modeFilter}`;
    printReport(
      instituteName,
      "Student Distribution & Status Report",
      filterDesc,
      ["Student Code", "Name", "Course", "Batch", "Learning Mode", "Status"],
      reportData.students.map((s: any) => [
        s.student_code,
        s.name,
        s.course?.name || "Unassigned",
        s.batch?.name || "Unassigned",
        s.learning_mode || "hybrid",
        s.status,
      ])
    );
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    exportToCSV(
      "students_report",
      [
        { header: "Student Code", key: "student_code" },
        { header: "Full Name", key: "name" },
        { header: "Course", key: "course_name" },
        { header: "Batch", key: "batch_name" },
        { header: "Learning Mode", key: "learning_mode" },
        { header: "Status", key: "status" },
      ],
      reportData.students.map((s: any) => ({
        ...s,
        course_name: s.course?.name || "Unassigned",
        batch_name: s.batch?.name || "Unassigned",
      }))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Analytics & Distribution
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Demographics, Course/Batch Enrollment & Status Reports — {instituteName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData?.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Students</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{reportData.metrics.totalStudents}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Active</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.metrics.activeStudents}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">On Hold</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{reportData.metrics.onHoldStudents}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-600 uppercase">Completed</span>
            <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{reportData.metrics.completedStudents}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Dropped</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{reportData.metrics.droppedStudents}</p>
          </div>
        </div>
      )}

      {/* Learning Mode Distribution Breakdown */}
      {reportData?.byLearningMode && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Learning Mode Distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reportData.byLearningMode.map((m: any) => (
              <div key={m.name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 capitalize">{m.name} Mode</span>
                <span className="text-sm font-extrabold text-brand-600 font-mono">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Filter className="w-4 h-4 text-brand-600" /> Filters:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
        >
          <option value="ALL">All Learning Modes</option>
          <option value="offline">Offline</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Filtered Students ({reportData?.students?.length || 0})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student details...</div>
        ) : reportData?.students?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reportData.students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.student_code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4">{s.course?.name || "—"}</td>
                    <td className="py-3.5 px-4">{s.batch?.name || "—"}</td>
                    <td className="py-3.5 px-4 capitalize">{s.learning_mode || "hybrid"}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/students/${s.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No student records match the selected filters.</div>
        )}
      </div>
    </div>
  );
}
