"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BadgeDollarSign, Download, Printer, Eye, CreditCard } from "lucide-react";
import DateFilterBar from "@/components/DateFilterBar";
import { exportToCSV, printReport } from "@/lib/export";
import { formatCurrency } from "@/lib/currency";

interface FinanceReportClientProps {
  instituteName: string;
}

export default function FinanceReportClient({ instituteName }: FinanceReportClientProps) {
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
      let url = `/api/reports/finance?range=${range}`;
      if (range === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch finance report", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    printReport(
      instituteName,
      "Outstanding Fee Balances Report",
      `Date Range: ${range.toUpperCase()}`,
      ["Student Code", "Name", "Course", "Final Fee", "Amount Paid", "Outstanding Balance", "Status"],
      reportData.outstandingFeesTable.map((f: any) => [
        f.student_code,
        f.name,
        f.course_name,
        formatCurrency(f.final_fee),
        formatCurrency(f.amount_paid),
        formatCurrency(f.balance),
        f.status,
      ])
    );
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    exportToCSV(
      "outstanding_fees_report",
      [
        { header: "Student Code", key: "student_code" },
        { header: "Name", key: "name" },
        { header: "Course", key: "course_name" },
        { header: "Total Fee", key: "final_fee" },
        { header: "Amount Paid", key: "amount_paid" },
        { header: "Balance", key: "balance" },
        { header: "Status", key: "status" },
      ],
      reportData.outstandingFeesTable
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Financial Fee Collections & Outstanding Balances
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Collections, Payment Methods (UPI, Cash, Bank) & Outstanding Receivables — {instituteName}
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
            <Printer className="w-4 h-4" /> Print Outstanding List
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

      {/* Summary KPI Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Expected</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(reportData.summary.totalExpected)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Collected</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{formatCurrency(reportData.summary.totalCollected)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Outstanding</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{formatCurrency(reportData.summary.totalOutstanding)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Overdue</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{formatCurrency(reportData.summary.overdueAmount)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase">Due Soon</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{formatCurrency(reportData.summary.dueSoonAmount)}</p>
          </div>
        </div>
      )}

      {/* Payment Methods Breakdown Grid */}
      {reportData?.paymentMethods && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Collection by Payment Method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reportData.paymentMethods.map((m: any) => (
              <div key={m.method} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{m.method}</span>
                <span className="text-sm font-extrabold text-emerald-600 font-mono">{formatCurrency(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outstanding Fee Balances Table */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-amber-50/40 border-b border-amber-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Outstanding Fee Accounts ({reportData?.outstandingFeesTable?.length || 0})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading fee account metrics...</div>
        ) : reportData?.outstandingFeesTable?.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-right">Total Fee</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reportData.outstandingFeesTable.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{f.student_code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{f.name}</td>
                    <td className="py-3.5 px-4">{f.course_name}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{formatCurrency(f.final_fee)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">{formatCurrency(f.amount_paid)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-extrabold">{formatCurrency(f.balance)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === "Overdue"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/students/${f.student_id}?tab=fees`}
                        className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Fee Plan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-emerald-600 font-semibold">
            ✓ All tuition fee balances are fully paid! 0 outstanding accounts.
          </div>
        )}
      </div>
    </div>
  );
}
