"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserCheck, Download, Printer, CheckSquare, Eye } from "lucide-react";
import { exportToCSV, printReport } from "@/lib/export";

interface StaffTasksReportClientProps {
  instituteName: string;
}

export default function StaffTasksReportClient({ instituteName }: StaffTasksReportClientProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/staff-tasks");
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff report", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    printReport(
      instituteName,
      "Staff Roster & Task Performance Report",
      "Active Staff & Task Metrics",
      ["Employee ID", "Full Name", "Role", "Department", "Designation", "Status"],
      reportData.staffPerformanceTable.map((s: any) => [
        s.employee_id,
        s.name,
        s.role,
        s.department || "—",
        s.designation || "—",
        s.status,
      ])
    );
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    exportToCSV(
      "staff_task_performance",
      [
        { header: "Employee ID", key: "employee_id" },
        { header: "Name", key: "name" },
        { header: "Role", key: "role" },
        { header: "Department", key: "department" },
        { header: "Designation", key: "designation" },
        { header: "Status", key: "status" },
      ],
      reportData.staffPerformanceTable
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff & Task Analytics Performance
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Staff Roster, Mentors & Workload Completion Rate Analytics — {instituteName}
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
            <Printer className="w-4 h-4" /> Print Staff Roster
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">{reportData.summary.activeStaffCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">{reportData.summary.totalMentors} Assigned Mentors</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</span>
            <p className="text-3xl font-extrabold text-purple-600 mt-1 font-mono">{reportData.summary.totalTasks}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {reportData.summary.completedTasks} Completed
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending & In Progress</span>
            <p className="text-3xl font-extrabold text-amber-600 mt-1 font-mono">
              {reportData.summary.pendingTasks + reportData.summary.inProgressTasks}
            </p>
            <p className="text-[11px] text-rose-500 font-semibold mt-1">
              {reportData.summary.overdueTasks} Overdue
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.summary.completionRate}</p>
            <p className="text-[11px] text-slate-500 mt-1">Overall Task Completion</p>
          </div>
        </div>
      )}

      {/* Staff Roster Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Staff & Mentor Roster ({reportData?.staffPerformanceTable?.length || 0})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading staff roster data...</div>
        ) : reportData?.staffPerformanceTable?.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reportData.staffPerformanceTable.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.employee_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4 font-semibold text-brand-700">{s.role}</td>
                    <td className="py-3.5 px-4">{s.department || "—"}</td>
                    <td className="py-3.5 px-4">{s.designation || "—"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/staff/${s.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Staff Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No staff members found.</div>
        )}
      </div>
    </div>
  );
}
