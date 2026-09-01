"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarCheck, Download, Printer, AlertTriangle, Eye } from "lucide-react";
import DateFilterBar from "@/components/DateFilterBar";
import { exportToCSV, printReport } from "@/lib/export";

interface AttendanceReportClientProps {
  instituteName: string;
}

export default function AttendanceReportClient({ instituteName }: AttendanceReportClientProps) {
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [range, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/attendance?range=${range}`;
      if (range === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch attendance report", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    printReport(
      instituteName,
      "Low Attendance Alert Report (< 75%)",
      `Date Range: ${range.toUpperCase()}`,
      ["Student Code", "Name", "Course", "Batch", "Attendance Rate", "Status"],
      reportData.lowAttendanceStudents.map((s: any) => [
        s.student_code,
        s.name,
        s.course_name,
        s.batch_name,
        s.attendancePct,
        s.status,
      ])
    );
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    exportToCSV(
      "low_attendance_students",
      [
        { header: "Student Code", key: "student_code" },
        { header: "Name", key: "name" },
        { header: "Course", key: "course_name" },
        { header: "Batch", key: "batch_name" },
        { header: "Attendance Rate", key: "attendancePct" },
        { header: "Status", key: "status" },
      ],
      reportData.lowAttendanceStudents
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Analytics & Threshold Alerts
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Overall Attendance, Trends & Low Attendance Threshold Monitoring — {instituteName}
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
            <Printer className="w-4 h-4" /> Print Low Attendance List
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar
        range={range}
        onRangeChange={setRange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Summary Metrics Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Overall Attendance</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.summary.overallPct}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{reportData.summary.presentCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Late</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{reportData.summary.lateCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Absent</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{reportData.summary.absentCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-600 uppercase">On Leave</span>
            <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{reportData.summary.leaveCount}</p>
          </div>
        </div>
      )}

      {/* Batch Comparison Breakdown */}
      {reportData?.batchComparison?.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Batch Attendance Comparison</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reportData.batchComparison.map((b: any) => (
              <div key={b.batch} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{b.batch}</span>
                  <span className="text-[11px] text-slate-500">Attendance Rate</span>
                </div>
                <span className="text-base font-extrabold text-emerald-600 font-mono">{b.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Attendance Threshold Alert Table (< 75%) */}
      <div className="bg-white rounded-3xl border border-rose-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-rose-950 text-base">
              Low Attendance Threshold Alerts (&lt; 75%) ({reportData?.lowAttendanceStudents?.length || 0})
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wider">
            Needs Intervention
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Evaluating student attendance records...</div>
        ) : reportData?.lowAttendanceStudents?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reportData.lowAttendanceStudents.map((s: any) => (
                  <tr key={s.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.student_code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4">{s.course_name}</td>
                    <td className="py-3.5 px-4">{s.batch_name}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold font-mono text-xs">
                        {s.attendancePct}
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
          <div className="p-12 text-center text-xs text-emerald-600 font-semibold">
            ✓ Excellent! 0 students currently fall below the 75% attendance threshold.
          </div>
        )}
      </div>
    </div>
  );
}
