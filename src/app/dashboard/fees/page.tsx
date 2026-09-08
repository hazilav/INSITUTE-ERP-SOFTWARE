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
  FileText,
  Ban,
  Undo2,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { formatCurrency } from "@/lib/currency";
import { fetchWithRetry } from "@/lib/api-client";

// Lazy-load financial modals to keep initial bundle lightweight
const CreateInvoiceModal = dynamic(() => import("@/components/CreateInvoiceModal"), { ssr: false });
const RecordPaymentModal = dynamic(() => import("@/components/RecordPaymentModal"), { ssr: false });
const InvoiceViewModal = dynamic(() => import("@/components/InvoiceViewModal"), { ssr: false });
const PaymentReceiptModal = dynamic(() => import("@/components/PaymentReceiptModal"), { ssr: false });
const CancelInvoiceModal = dynamic(() => import("@/components/CancelInvoiceModal"), { ssr: false });
const VoidPaymentModal = dynamic(() => import("@/components/VoidPaymentModal"), { ssr: false });
const CreateFeePlanModal = dynamic(() => import("@/components/CreateFeePlanModal"), { ssr: false });

interface InvoiceItem {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  description?: string | null;
  amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  notes?: string | null;
  is_cancelled?: boolean;
  cancel_reason?: string | null;
  student: {
    id: string;
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  course?: { id: string; name: string; code?: string | null } | null;
  payments?: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
  }>;
  created_by?: { id: string; name: string } | null;
}

interface PaymentItem {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  is_voided?: boolean;
  void_reason?: string | null;
  student?: {
    id: string;
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    course?: { name: string } | null;
  } | null;
  invoice?: {
    id: string;
    invoice_number: string;
    final_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    course?: { name: string } | null;
  } | null;
  fee_plan?: {
    balance: number;
    final_fee: number;
    course: { name: string };
  } | null;
  recorded_by?: { name: string } | null;
}

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
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanItem[]>([]);
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

  // Tabs: 'invoices' | 'payments' | 'overdue' | 'plans'
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "overdue" | "plans">("invoices");

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modals State
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<string | undefined>(undefined);

  const [invoiceViewModalOpen, setInvoiceViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const [cancelInvoiceModalOpen, setCancelInvoiceModalOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<any>(null);

  const [voidPaymentModalOpen, setVoidPaymentModalOpen] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState<any>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const [feeRes, invRes, payRes] = await Promise.all([
        fetchWithRetry<{
          success: boolean;
          feePlans: FeePlanItem[];
          metrics: Metrics;
          activeCourses: SelectOption[];
          activeBatches: SelectOption[];
        }>(`/api/fees?${params.toString()}`),
        fetchWithRetry<{
          success: boolean;
          invoices: InvoiceItem[];
        }>(`/api/invoices?${params.toString()}`),
        fetchWithRetry<{
          success: boolean;
          payments: PaymentItem[];
        }>(`/api/fees/payments?${params.toString()}`),
      ]);

      if (feeRes.ok && feeRes.data?.success) {
        setFeePlans(feeRes.data.feePlans || []);
        setMetrics(feeRes.data.metrics || { totalExpected: 0, totalCollected: 0, totalPending: 0, overdue: 0, dueSoon: 0 });
        setActiveCourses(feeRes.data.activeCourses || []);
        setActiveBatches(feeRes.data.activeBatches || []);
      } else if (!feeRes.ok) {
        setFetchError(feeRes.error || "Failed to load fee plans.");
      }

      if (invRes.ok && invRes.data?.success) {
        setInvoices(invRes.data.invoices || []);
      }

      if (payRes.ok && payRes.data?.success) {
        setPayments(payRes.data.payments || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch financial data", err);
      setFetchError("Unable to load financial data right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, courseFilter, statusFilter]);

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
      case "Unpaid":
      case "Pending":
        return { label: "Unpaid", style: "bg-amber-100 text-amber-800 border-amber-200" };
      case "Cancelled":
        return { label: "Cancelled", style: "bg-slate-100 text-slate-500 border-slate-200 line-through" };
      default:
        return { label: status, style: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  const handleOpenInvoice = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (data.success && data.invoice) {
        setSelectedInvoice(data.invoice);
      } else {
        setSelectedInvoice(inv);
      }
    } catch {
      setSelectedInvoice(inv);
    }
    setInvoiceViewModalOpen(true);
  };

  const handleOpenReceipt = (p: PaymentItem) => {
    const courseName =
      p.invoice?.course?.name ||
      p.fee_plan?.course?.name ||
      p.student?.course?.name ||
      "General Course";

    const remainingBal = p.invoice
      ? p.invoice.outstanding_amount
      : p.fee_plan
      ? p.fee_plan.balance
      : 0;

    setSelectedReceipt({
      id: p.id,
      receipt_number: p.receipt_number,
      amount: p.amount,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      notes: p.notes,
      student: {
        student_code: p.student?.student_code || "",
        name: p.student?.name || "Student",
        phone: p.student?.phone || "",
        email: p.student?.email || "",
      },
      course_name: courseName,
      invoice_number: p.invoice?.invoice_number || null,
      invoice_total: p.invoice?.final_amount || p.fee_plan?.final_fee || p.amount,
      previously_paid: p.invoice
        ? Math.max(0, p.invoice.paid_amount - p.amount)
        : undefined,
      this_payment: p.amount,
      remaining_balance: remainingBal,
      status: p.is_voided ? "Voided" : "Valid",
      recorded_by_name: p.recorded_by?.name || "Staff",
      institute_name: "Institute ERP",
    });
    setReceiptModalOpen(true);
  };

  const overdueInvoices = invoices.filter((inv) => inv.status === "Overdue" && !inv.is_cancelled);
  const overduePlans = feePlans.filter((p) => p.status === "Overdue" || p.balance > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">
          Dashboard
        </Link>
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
            Generate student fee invoices, record payments, issue official receipts, and manage outstanding dues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setCreatePlanModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-1.5 min-h-[40px]"
            title="Create installment fee plan"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" /> Fee Plan
          </button>
          <button
            onClick={() => {
              setSelectedInvoiceForPayment(undefined);
              setRecordPaymentModalOpen(true);
            }}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center gap-1.5 min-h-[40px] shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" /> Record Payment
          </button>
          <button
            onClick={() => setCreateInvoiceModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 min-h-[40px]"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
      </div>

      {/* Top Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {formatCurrency(metrics.totalExpected)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {formatCurrency(metrics.totalCollected)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">
              {formatCurrency(metrics.totalPending)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Dues</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">
              {formatCurrency(metrics.overdue)}
            </p>
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
        <nav className="flex gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "invoices"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payments & Receipts ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overdue"
                ? "border-rose-600 text-rose-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Dues ({overdueInvoices.length + overduePlans.length})
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "plans"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Fee Plans ({feePlans.length})
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
            placeholder="Search by student name, Student ID, invoice # (INV-...), or receipt # (REC-...)..."
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
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
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
              <option value="Unpaid">Unpaid</option>
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
        ) : fetchError && invoices.length === 0 && feePlans.length === 0 ? (
          <ErrorState
            title="Failed to load financial records"
            message={fetchError}
            onRetry={fetchData}
            className="border-none shadow-none my-0"
          />
        ) : activeTab === "invoices" ? (
          invoices.length === 0 ? (
            <div className="p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Invoices Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Create a student invoice to bill for tuition, lab fees, admission, or other course fees.
                </p>
              </div>
              <button
                onClick={() => setCreateInvoiceModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Create First Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[850px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Course</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5 text-right">Total</th>
                    <th className="px-6 py-3.5 text-right">Paid</th>
                    <th className="px-6 py-3.5 text-right">Outstanding</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="text-brand-600 hover:text-brand-800 hover:underline"
                          >
                            {inv.invoice_number}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/students/${inv.student.id}?tab=fees`}
                            className="font-bold text-slate-900 hover:text-brand-600 hover:underline text-sm block"
                          >
                            {inv.student.name}
                          </Link>
                          <span className="font-mono text-xs text-brand-600">
                            {inv.student.student_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {inv.course?.name || "General"}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {new Date(inv.due_date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.final_amount)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(inv.paid_amount)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-brand-600">
                          {formatCurrency(inv.outstanding_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${badge.style}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.outstanding_amount > 0 && !inv.is_cancelled && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv.id);
                                  setRecordPaymentModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors"
                              >
                                Pay
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Invoice & PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!inv.is_cancelled && inv.paid_amount === 0 && (
                              <button
                                onClick={() => {
                                  setInvoiceToCancel({
                                    id: inv.id,
                                    invoice_number: inv.invoice_number,
                                    student_name: inv.student.name,
                                    final_amount: inv.final_amount,
                                    paid_amount: inv.paid_amount,
                                  });
                                  setCancelInvoiceModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Cancel Invoice"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "payments" ? (
          payments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Receipt #</th>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5 text-right">Amount Paid</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-brand-600">
                        {p.receipt_number}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700">
                        {p.invoice?.invoice_number || "—"}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {p.student?.name || "Student"}
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">
                          {p.student?.student_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        {p.is_voided ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-200">
                            Voided
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReceipt(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Receipt
                          </button>
                          {!p.is_voided && (
                            <button
                              onClick={() => {
                                setPaymentToVoid({
                                  id: p.id,
                                  receipt_number: p.receipt_number,
                                  amount: p.amount,
                                  student_name: p.student?.name,
                                });
                                setVoidPaymentModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Void Payment"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "overdue" ? (
          overdueInvoices.length === 0 && overduePlans.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              🎉 No overdue accounts found. All payments are up to date!
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[750px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Reference</th>
                    <th className="px-6 py-3.5 text-right">Overdue Balance</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5">Contact Phone</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <Link href={`/dashboard/students/${inv.student.id}?tab=fees`} className="hover:underline">
                          {inv.student.name} ({inv.student.student_code})
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-rose-600">
                        {formatCurrency(inv.outstanding_amount)}
                      </td>
                      <td className="px-6 py-4 font-mono text-rose-700 font-bold">
                        {new Date(inv.due_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4 font-mono">{inv.student.phone || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPayment(inv.id);
                            setRecordPaymentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                  {overduePlans.map((plan) => {
                    const earliestDueDate = plan.installments[0]?.due_date;
                    return (
                      <tr key={plan.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <Link href={`/dashboard/students/${plan.student.id}?tab=fees`} className="hover:underline">
                            {plan.student.name} ({plan.student.student_code})
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-700">
                          Plan ({plan.course.name})
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-rose-600">
                          {formatCurrency(plan.balance)}
                        </td>
                        <td className="px-6 py-4 font-mono text-rose-700 font-bold">
                          {earliestDueDate ? new Date(earliestDueDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-6 py-4 font-mono">{plan.student.phone}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedInvoiceForPayment(undefined);
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
          )
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[750px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5 text-right">Final Fee</th>
                  <th className="px-6 py-3.5 text-right">Paid</th>
                  <th className="px-6 py-3.5 text-right">Balance</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {feePlans.map((plan) => {
                  const badge = getStatusBadge(plan.status);
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
                        {plan.course.name}
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
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
        )}
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={createInvoiceModalOpen}
        onClose={() => setCreateInvoiceModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      <CreateFeePlanModal
        isOpen={createPlanModalOpen}
        onClose={() => setCreatePlanModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => {
          setRecordPaymentModalOpen(false);
          setSelectedInvoiceForPayment(undefined);
        }}
        preselectedInvoiceId={selectedInvoiceForPayment}
        onSuccess={(receipt) => {
          fetchData();
          if (receipt) {
            setSelectedReceipt(receipt);
            setReceiptModalOpen(true);
          }
        }}
      />

      <InvoiceViewModal
        isOpen={invoiceViewModalOpen}
        onClose={() => {
          setInvoiceViewModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onPaymentClick={(inv: any) => {
          setInvoiceViewModalOpen(false);
          setSelectedInvoiceForPayment(inv.id);
          setRecordPaymentModalOpen(true);
        }}
      />

      <PaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedReceipt(null);
        }}
        receiptData={selectedReceipt}
      />

      <CancelInvoiceModal
        isOpen={cancelInvoiceModalOpen}
        onClose={() => {
          setCancelInvoiceModalOpen(false);
          setInvoiceToCancel(null);
        }}
        invoice={invoiceToCancel}
        onSuccess={() => fetchData()}
      />

      <VoidPaymentModal
        isOpen={voidPaymentModalOpen}
        onClose={() => {
          setVoidPaymentModalOpen(false);
          setPaymentToVoid(null);
        }}
        payment={paymentToVoid}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
