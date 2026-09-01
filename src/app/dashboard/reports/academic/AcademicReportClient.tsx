"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileBarChart, Download, Printer, Eye, Award } from "lucide-react";
import { exportToCSV, printReport } from "@/lib/export";

interface AcademicReportClientProps {
  instituteName: string;
}

export default function AcademicReportClient({ instituteName }: AcademicReportClientProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/academic");
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch academic report", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    printReport(
      instituteName,
      "Academic Performance & Assessment Grades",
      "All Finalized Assessment Results",
      ["Student ID", "Name", "Course", "Batch", "Average Score", "Grade", "Result"],
      reportData.studentPerformanceTable.map((s: any) => [
        s.student_code,
        s.name,
        s.course_name,
        s.batch_name,
        s.avgPct,
        s.grade,
        s.result,
      ])
    );
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    exportToCSV(
      "academic_performance_report",
      [
        { header: "Student ID", key: "student_code" },
        { header: "Name", key: "name" },
        { header: "Course", key: "course_name" },
        { header: "Batch", key: "batch_name" },
        { header: "Average Score", key: "avgPct" },
        { header: "Grade", key: "grade" },
        { header: "Result", key: "result" },
      ],
      reportData.studentPerformanceTable
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Academic Performance & Grading Report
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Pass/Fail Analytics, Grade Distributions & Course/Batch Scores — {instituteName}
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
            <Printer className="w-4 h-4" /> Print Academic Report
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Assessment Score</span>
            <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{reportData.summary.avgPercentage}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Pass Rate</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.summary.passRate}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Fail Rate</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{reportData.summary.failRate}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-brand-600 uppercase">Finalized Assessments</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{reportData.summary.completedAssessments}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Pending Evaluation</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{reportData.summary.pendingEvaluation}</p>
          </div>
        </div>
      )}

      {/* Course & Batch Performance Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance by Course */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Performance by Course</h3>
          {reportData?.performanceByCourse?.length > 0 ? (
            <div className="space-y-2">
              {reportData.performanceByCourse.map((c: any) => (
                <div key={c.course} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{c.course}</span>
                  <span className="text-sm font-extrabold text-purple-600 font-mono">{c.avgPct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">No course assessment data available.</div>
          )}
        </div>

        {/* Performance by Batch */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Performance by Batch</h3>
          {reportData?.performanceByBatch?.length > 0 ? (
            <div className="space-y-2">
              {reportData.performanceByBatch.map((b: any) => (
                <div key={b.batch} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{b.batch}</span>
                  <span className="text-sm font-extrabold text-purple-600 font-mono">{b.avgPct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">No batch assessment data available.</div>
          )}
        </div>
      </div>

      {/* Student Academic Results Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Student Performance Summary ({reportData?.studentPerformanceTable?.length || 0})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Aggregating student assessment grades...</div>
        ) : reportData?.studentPerformanceTable?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4 text-right">Average Score</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reportData.studentPerformanceTable.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.student_code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4">{s.course_name}</td>
                    <td className="py-3.5 px-4">{s.batch_name}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-purple-600 font-mono">{s.avgPct}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold font-mono">
                        {s.grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.result === "Pass"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {s.result}
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
          <div className="p-12 text-center text-xs text-slate-400">No finalized assessment results found.</div>
        )}
      </div>
    </div>
  );
}
