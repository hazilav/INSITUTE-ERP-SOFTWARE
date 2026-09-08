"use client";

import { useState } from "react";
import {
  FileText,
  CreditCard,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Calendar,
  Layers,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/currency";

const InvoiceViewModal = dynamic(() => import("@/components/InvoiceViewModal"), { ssr: false });
const PaymentReceiptModal = dynamic(() => import("@/components/PaymentReceiptModal"), { ssr: false });

interface StudentFeeProfileClientProps {
  feePlan?: any;
  invoices: any[];
  payments: any[];
  student: {
    id: string;
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    course_name: string;
  };
  instituteDetails: {
    name: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logo?: string | null;
    tax_number?: string | null;
    tax_name?: string | null;
  };
}

export default function StudentFeeProfileClient({
  feePlan,
  invoices = [],
  payments = [],
  student,
  instituteDetails,
}: StudentFeeProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "receipts" | "schedule">("invoices");

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Financial calculations
  let totalCourseFee = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  if (invoices.length > 0) {
    invoices.forEach((inv) => {
      if (!inv.is_cancelled) {
        totalCourseFee += inv.final_amount;
        totalPaid += inv.paid_amount;
        totalOutstanding += inv.outstanding_amount;
      }
    });
  } else if (feePlan) {
    totalCourseFee = feePlan.final_fee || feePlan.course_fee || 0;
    totalPaid = feePlan.amount_paid || 0;
    totalOutstanding = feePlan.balance || 0;
  }

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

  const handleOpenInvoice = (inv: any) => {
    setSelectedInvoice({
      ...inv,
      student: {
        student_code: student.student_code,
        name: student.name,
        phone: student.phone,
        email: student.email,
      },
      institute: {
        name: instituteDetails.name,
        logo: instituteDetails.logo,
        address: instituteDetails.address,
        phone: instituteDetails.phone,
        email: instituteDetails.email,
        tax_number: instituteDetails.tax_number,
        tax_name: instituteDetails.tax_name,
      },
    });
    setInvoiceModalOpen(true);
  };

  const handleOpenReceipt = (p: any) => {
    const courseName =
      p.invoice?.course?.name ||
      p.fee_plan?.course?.name ||
      student.course_name ||
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
        student_code: student.student_code,
        name: student.name,
        phone: student.phone,
        email: student.email,
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
      recorded_by_name: p.recorded_by?.name || "Accounts Office",
      institute_name: instituteDetails.name,
      institute_logo: instituteDetails.logo,
      institute_address: instituteDetails.address,
      institute_phone: instituteDetails.phone,
      institute_email: instituteDetails.email,
    });
    setReceiptModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Fees & Receipts
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Authorized fee invoices, official payment receipts, and installment schedules
        </p>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Course Fee
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalCourseFee)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Paid
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding
            </span>
            <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
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
            onClick={() => setActiveTab("receipts")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "receipts"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Receipts Log ({payments.length})
          </button>
          {feePlan?.installments?.length > 0 && (
            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "schedule"
                  ? "border-brand-600 text-brand-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Installments Plan ({feePlan.installments.length})
            </button>
          )}
        </nav>
      </div>

      {/* Main Tab Views */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {activeTab === "invoices" ? (
          invoices.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No invoices issued yet.</p>
              <p>Your official tuition invoices will be visible here once generated by the institute.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5 text-right">Total</th>
                    <th className="px-6 py-3.5 text-right">Paid</th>
                    <th className="px-6 py-3.5 text-right">Outstanding</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {new Date(inv.invoice_date).toLocaleDateString("en-IN")}
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
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs flex items-center gap-1.5 ml-auto transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View / PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "receipts" ? (
          payments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No payment receipts found.</p>
              <p>Receipts will appear here automatically when payments are recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Receipt #</th>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5 text-right">Amount Paid</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Ref #</th>
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
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {p.reference_number || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenReceipt(p)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 ml-auto transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Installment</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {feePlan?.installments?.map((inst: any) => (
                  <tr key={inst.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">{inst.name}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inst.amount)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {new Date(inst.due_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`px-2 py-0.5 font-bold rounded ${
                          inst.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : inst.status === "Overdue"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InvoiceViewModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      <PaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedReceipt(null);
        }}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
