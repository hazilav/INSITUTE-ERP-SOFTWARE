"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  FileBarChart,
  BadgeDollarSign,
  UserCheck,
  CheckSquare,
  ArrowRight,
  Printer,
  Download,
  Sparkles,
} from "lucide-react";
import DateFilterBar from "@/components/DateFilterBar";
import { exportToCSV, printReport } from "@/lib/export";
import { formatCurrency } from "@/lib/currency";

interface ReportsOverviewClientProps {
  instituteName: string;
  role: string;
}

export default function ReportsOverviewClient({ instituteName, role }: ReportsOverviewClientProps) {
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
  }, [range, startDate, endDate]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/overview?range=${range}`;
      if (range === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to fetch reports overview", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!metrics) return;
    printReport(
      instituteName,
      "Reports Overview Dashboard",
      `Date Range: ${range.toUpperCase()}`,
      ["Metric", "Value"],
      [
        ["Total Students", metrics.totalStudents],
        ["Active Students", metrics.activeStudents],
        ["Overall Attendance", metrics.overallAttendancePct],
        ["Avg Academic Performance", metrics.overallAcademicPct],
        ["Total Fees Collected", formatCurrency(metrics.totalFeesCollected)],
        ["Outstanding Fees", formatCurrency(metrics.totalOutstandingFees)],
        ["Active Staff", metrics.activeStaffCount],
        ["Pending Tasks", metrics.pendingTasksCount],
      ]
    );
  };

  const handleExportCSV = () => {
    if (!metrics) return;
    exportToCSV(
      "reports_overview",
      [
        { header: "Metric", key: "metric" },
        { header: "Value", key: "value" },
      ],
      [
        { metric: "Total Students", value: metrics.totalStudents },
        { metric: "Active Students", value: metrics.activeStudents },
        { metric: "Overall Attendance", value: metrics.overallAttendancePct },
        { metric: "Avg Academic Performance", value: metrics.overallAcademicPct },
        { metric: "Total Fees Collected", value: metrics.totalFeesCollected },
        { metric: "Outstanding Fees", value: metrics.totalOutstandingFees },
        { metric: "Active Staff", value: metrics.activeStaffCount },
        { metric: "Pending Tasks", value: metrics.pendingTasksCount },
      ]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reports & Analytics Overview
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Center Performance Summary & Operations — {instituteName}
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

      {/* Date Filter Bar */}
      <DateFilterBar
        range={range}
        onRangeChange={setRange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Primary KPI Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading performance analytics...</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/reports/students"
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</span>
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.totalStudents}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {metrics.activeStudents} Active Profiles
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-brand-600 font-bold">
              <span>View Detailed Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/reports/attendance"
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Attendance</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.overallAttendancePct}</p>
              <p className="text-[11px] text-slate-500 mt-1">Class Attendance Rate</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-bold">
              <span>View Attendance Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/reports/academic"
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Perf.</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileBarChart className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-purple-600 font-mono">{metrics.overallAcademicPct}</p>
              <p className="text-[11px] text-slate-500 mt-1">Avg Assessment Score</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-bold">
              <span>View Academic Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/reports/finance"
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fees Collected</span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-emerald-600 font-mono">{formatCurrency(metrics.totalFeesCollected)}</p>
              <p className="text-[11px] text-rose-500 font-semibold mt-1 font-mono">
                Outstanding: {formatCurrency(metrics.totalOutstandingFees)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
              <span>View Financial Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      ) : null}

      {/* Sub-Reports Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <Link
          href="/dashboard/reports/students"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Student Analytics Report</h3>
          <p className="text-xs text-slate-500">
            Student counts, new admissions, course/batch breakdown, and learning mode distribution.
          </p>
        </Link>

        <Link
          href="/dashboard/reports/attendance"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Attendance Analytics</h3>
          <p className="text-xs text-slate-500">
            Overall attendance rate, daily trends, batch comparison, and low attendance alert list (&lt;75%).
          </p>
        </Link>

        <Link
          href="/dashboard/reports/academic"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileBarChart className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Academic Performance</h3>
          <p className="text-xs text-slate-500">
            Pass/fail rates, course & batch scores, assessment evaluation status, and student grade breakdown.
          </p>
        </Link>

        <Link
          href="/dashboard/reports/finance"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Financial Fee Collections</h3>
          <p className="text-xs text-slate-500">
            Total collections, overdue balances, collection trends by payment method (UPI, Cash, Bank, Card).
          </p>
        </Link>

        <Link
          href="/dashboard/reports/staff-tasks"
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Staff & Task Performance</h3>
          <p className="text-xs text-slate-500">
            Staff workload, task completion percentages, pending/overdue task tracking per mentor.
          </p>
        </Link>
      </div>
    </div>
  );
}
