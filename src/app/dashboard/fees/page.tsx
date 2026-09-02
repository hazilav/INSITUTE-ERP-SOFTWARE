"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Printer,
  Calendar,
  Layers,
  BookOpen,
} from "lucide-react";
import dynamic from "next/dynamic";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { formatCurrency } from "@/lib/currency";
import { fetchWithRetry } from "@/lib/api-client";

// Lazy-load financial modals to keep initial bundle lightweight
const CreateFeePlanModal = dynamic(() => import("@/components/CreateFeePlanModal"), { ssr: false });
const RecordPaymentModal = dynamic(() => import("@/components/RecordPaymentModal"), { ssr: false });
const PaymentReceiptModal = dynamic(() => import("@/components/PaymentReceiptModal"), { ssr: false });

interface FeePlanItem {
  id: string;
  course_fee: number;
  discount_type: string;
  discount_value: number;
  final_fee: number;
  amount_paid: number;
  balance: number;
  payment_type: string;
  status: string;
  created_at: string;
  student: {
    id: string;
    student_code: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  course: { id: string; name: string; code?: string | null };
  batch?: { id: string; name: string; code?: string | null } | null;
  installments: Array<{
    id: string;
    name: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
  }>;
}

interface PaymentItem {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  student: {
    id: string;
    student_code: string;
    name: string;
    phone: string;
  };
  fee_plan: {
    balance: number;
    course: { name: string };
  };
  recorded_by?: { name: string } | null;
}

interface SelectOption {
  id: string;
  name: string;
}

interface Metrics {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  overdue: number;
  dueSoon: number;
}

export default function FeesPage() {
  const [feePlans, setFeePlans] = useState<FeePlanItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalExpected: 0,
    totalCollected: 0,
    totalPending: 0,
    overdue: 0,
    dueSoon: 0,
  });
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [activeBatches, setActiveBatches] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-Tabs State: 'accounts' | 'overdue' | 'duesoon' | 'payments'
  const [activeTab, setActiveTab] = useState<"accounts" | "overdue" | "duesoon" | "payments">("accounts");

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debounce search input to avoid duplicate/rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals State
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | undefined>(undefined);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (batchFilter !== "ALL") params.set("batch_id", batchFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        feePlans: FeePlanItem[];
        metrics: Metrics;
        activeCourses: SelectOption[];
        activeBatches: SelectOption[];
      }>(`/api/fees?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setFeePlans(res.data.feePlans || []);
        setMetrics(res.data.metrics || { totalExpected: 0, totalCollected: 0, totalPending: 0, overdue: 0, dueSoon: 0 });
        setActiveCourses(res.data.activeCourses || []);
        setActiveBatches(res.data.activeBatches || []);
      } else {
        setFetchError(res.error || "Failed to load fee plans.");
      }

      // Fetch Recent Payments History
      const payRes = await fetchWithRetry<{
        success: boolean;
        payments: any[];
      }>("/api/fees/payments");

      if (payRes.ok && payRes.data?.success) {
        setRecentPayments(payRes.data.payments || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch fees data", err);
      setFetchError("Unable to load fee data right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, courseFilter, batchFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return { label: "Paid", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "Partially Paid":
        return { label: "Partially Paid", style: "bg-blue-100 text-blue-800 border-blue-200" };
      case "Overdue":
        return { label: "🔴 Overdue", style: "bg-rose-100 text-rose-800 border-rose-200" };
      case "Pending":
        return { label: "Pending", style: "bg-amber-100 text-amber-800 border-amber-200" };
      default:
        return { label: status, style: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  const overdueFeePlans = feePlans.filter((p) => p.status === "Overdue" || p.balance > 0);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dueSoonInstallments: any[] = [];
  feePlans.forEach((plan) => {
    plan.installments.forEach((inst) => {
      const d = new Date(inst.due_date);
      if (inst.status === "Pending" && d >= now && d <= sevenDaysFromNow) {
        dueSoonInstallments.push({
          ...inst,
          student: plan.student,
          course: plan.course,
          planId: plan.id,
        });
      }
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Finance</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Fees & Payments</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Fees & Payments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage student course fees, record payments, generate official receipts, and monitor overdue accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setCreatePlanModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-1.5 min-h-[42px]"
          >
            <Plus className="w-4 h-4 text-slate-500" /> Create Fee Plan
          </button>
          <button
            onClick={() => {
              setSelectedPlanForPayment(undefined);
              setRecordPaymentModalOpen(true);
            }}
            className="flex-1 sm:flex-initial justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 min-h-[42px]"
          >
            <CreditCard className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* Top Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expected</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{formatCurrency(metrics.totalExpected)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{formatCurrency(metrics.totalCollected)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pending</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{formatCurrency(metrics.totalPending)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Fees</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{formatCurrency(metrics.overdue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Soon (7 Days)</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{metrics.dueSoon}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "accounts"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Fee Accounts ({feePlans.length})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "overdue"
                ? "border-rose-600 text-rose-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Overdue Fees ({overdueFeePlans.length})
          </button>
          <button
            onClick={() => setActiveTab("duesoon")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "duesoon"
                ? "border-amber-600 text-amber-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Due Soon (7 Days) ({dueSoonInstallments.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "payments"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Payment Receipts Log ({recentPayments.length})
          </button>
        </nav>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, Student ID, phone number, or receipt #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Batches</option>
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : fetchError && feePlans.length === 0 ? (
          <ErrorState
            title="Failed to load fee records"
            message={fetchError}
            onRetry={fetchData}
            className="border-none shadow-none my-0"
          />
        ) : activeTab === "accounts" ? (
          feePlans.length === 0 ? (
            <div className="p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
                <BadgeDollarSign className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Fee Plans Created</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Create a fee plan for registered students to manage tuition, discounts, and payments.
                </p>
              </div>
              <button
                onClick={() => setCreatePlanModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Create Fee Plan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[750px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Course & Batch</th>
                    <th className="px-6 py-3.5 text-right">Final Fee</th>
                    <th className="px-6 py-3.5 text-right">Paid</th>
                    <th className="px-6 py-3.5 text-right">Balance</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {feePlans.map((plan) => {
                    const badge = getStatusBadge(plan.status);
                    const earliestDueDate = plan.installments[0]?.due_date;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/students/${plan.student.id}?tab=fees`}
                            className="font-bold text-slate-900 hover:text-brand-600 hover:underline text-sm block"
                          >
                            {plan.student.name}
                          </Link>
                          <span className="font-mono text-xs text-brand-600">
                            {plan.student.student_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          <div>{plan.course.name}</div>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {plan.batch?.name || "General Batch"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(plan.final_fee)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(plan.amount_paid)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-brand-600">
                          {formatCurrency(plan.balance)}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {earliestDueDate ? new Date(earliestDueDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${badge.style}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {plan.balance > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedPlanForPayment(plan.id);
                                  setRecordPaymentModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors"
                              >
                                Record Payment
                              </button>
                            )}
                            <Link
                              href={`/dashboard/students/${plan.student.id}?tab=fees`}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Student Fee Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "overdue" ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5 text-right">Overdue Balance</th>
                  <th className="px-6 py-3.5">Earliest Due Date</th>
                  <th className="px-6 py-3.5">Days Overdue</th>
                  <th className="px-6 py-3.5">Contact Phone</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {overdueFeePlans.map((plan) => {
                  const earliestDueDate = plan.installments[0]?.due_date;
                  const daysOverdue = earliestDueDate
                    ? Math.max(0, Math.floor((now.getTime() - new Date(earliestDueDate).getTime()) / (1000 * 60 * 60 * 24)))
                    : 0;

                  return (
                    <tr key={plan.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <Link href={`/dashboard/students/${plan.student.id}?tab=fees`} className="hover:underline">
                          {plan.student.name} ({plan.student.student_code})
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-rose-600">
                        {formatCurrency(plan.balance)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {earliestDueDate ? new Date(earliestDueDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-rose-600">
                        {daysOverdue} days overdue
                      </td>
                      <td className="px-6 py-4 font-mono">{plan.student.phone}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPlanForPayment(plan.id);
                            setRecordPaymentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : activeTab === "duesoon" ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[650px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Installment Name</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {dueSoonInstallments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {inst.student.name} ({inst.student.student_code})
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{inst.name}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-amber-600">{formatCurrency(inst.amount)}</td>
                    <td className="px-6 py-4 font-mono">{new Date(inst.due_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPlanForPayment(inst.planId);
                          setRecordPaymentModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Receipt #</th>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5 text-right">Amount Paid</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Ref #</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-brand-600">{p.receipt_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{p.student.name}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4">{p.payment_method}</td>
                    <td className="px-6 py-4 font-mono">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{p.reference_number || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedReceipt({
                            ...p,
                            course_name: p.fee_plan.course.name,
                            remaining_balance: p.fee_plan.balance,
                            recorded_by_name: p.recorded_by?.name || "Staff",
                            institute_name: "Institute CRM",
                          });
                          setReceiptModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFeePlanModal
        isOpen={createPlanModalOpen}
        onClose={() => setCreatePlanModalOpen(false)}
        onSuccess={fetchData}
      />

      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => setRecordPaymentModalOpen(false)}
        onSuccess={fetchData}
        preselectedPlanId={selectedPlanForPayment}
      />

      <PaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
