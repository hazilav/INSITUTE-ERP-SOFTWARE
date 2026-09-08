"use client";

import { useRef, useState } from "react";
import { Printer, Download, Share2, Building2, Receipt, CheckCircle2, AlertCircle, Clock, Copy, Check } from "lucide-react";
import Modal from "./Modal";
import { formatCurrency } from "@/lib/currency";

export interface InvoiceViewData {
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
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  course?: {
    name: string;
    code?: string | null;
  } | null;
  payments?: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
  }>;
  institute?: {
    name: string;
    logo?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    tax_number?: string | null;
    tax_name?: string | null;
  } | null;
}

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: InvoiceViewData | null;
  invoiceData?: InvoiceViewData | null;
  onPaymentClick?: (invoice: InvoiceViewData) => void;
}

export default function InvoiceViewModal({
  isOpen,
  onClose,
  invoice: propInvoice,
  invoiceData,
  onPaymentClick,
}: InvoiceViewModalProps) {
  const invoice = propInvoice || invoiceData;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Triggers standard print-to-PDF dialog in modern browsers
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Fee Invoice #${invoice.invoice_number} for ${invoice.student.name} - Total: ${formatCurrency(invoice.final_amount)}, Outstanding: ${formatCurrency(invoice.outstanding_amount)}.`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fee Invoice #${invoice.invoice_number}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const instName = invoice.institute?.name || "Institute Management System";
  const instLogo = invoice.institute?.logo;
  const instPhone = invoice.institute?.phone;
  const instEmail = invoice.institute?.email;
  const instWebsite = invoice.institute?.website;
  const instAddress = [
    invoice.institute?.address,
    invoice.institute?.city,
    invoice.institute?.state,
    invoice.institute?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const isOverdue =
    invoice.status === "Overdue" ||
    (invoice.outstanding_amount > 0 && new Date(invoice.due_date) < new Date());

  const getStatusBadge = () => {
    if (invoice.is_cancelled || invoice.status === "Cancelled") {
      return {
        label: "CANCELLED",
        style: "bg-slate-100 text-slate-700 border-slate-300",
      };
    }
    if (invoice.status === "Paid" || invoice.outstanding_amount <= 0.001) {
      return {
        label: "PAID IN FULL",
        style: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    }
    if (isOverdue) {
      return {
        label: "OVERDUE",
        style: "bg-rose-100 text-rose-800 border-rose-300",
      };
    }
    if (invoice.paid_amount > 0) {
      return {
        label: "PARTIALLY PAID",
        style: "bg-blue-100 text-blue-800 border-blue-300",
      };
    }
    return {
      label: "UNPAID",
      style: "bg-amber-100 text-amber-800 border-amber-300",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fee Invoice #${invoice.invoice_number}`}
      subtitle={`Official tuition invoice for ${invoice.student.name}`}
      icon={<Receipt className="w-5 h-5 text-brand-600" />}
      maxWidth="3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Info
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      }
    >
      {/* Professional A4 Invoice Document Layout */}
      <div
        ref={invoiceRef}
        className="space-y-6 text-slate-800 bg-white p-4 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs print:p-0 print:border-none print:shadow-none"
      >
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
          <div className="flex items-start gap-3.5">
            {instLogo ? (
              <img
                src={instLogo}
                alt={instName}
                className="w-14 h-14 rounded-xl object-contain border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                {instName}
              </h1>
              {instAddress && <p className="text-xs text-slate-600">{instAddress}</p>}
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                {instPhone && <span>Phone: {instPhone}</span>}
                {instEmail && <span>Email: {instEmail}</span>}
                {instWebsite && <span>Web: {instWebsite}</span>}
              </div>
              {invoice.institute?.tax_number && (
                <p className="text-[11px] font-mono text-slate-500 font-semibold">
                  GSTIN / Tax ID: {invoice.institute.tax_number}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase font-mono">
              FEE INVOICE
            </h2>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex sm:justify-end gap-2">
                <span className="text-slate-400 uppercase font-bold">Invoice #:</span>
                <span className="font-mono font-bold text-brand-700 text-sm">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="flex sm:justify-end gap-2">
                <span className="text-slate-400 uppercase font-bold">Date:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {new Date(invoice.invoice_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex sm:justify-end gap-2">
                <span className="text-slate-400 uppercase font-bold">Due Date:</span>
                <span className="font-mono font-bold text-rose-700">
                  {new Date(invoice.due_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              BILL TO (STUDENT)
            </span>
            <p className="font-extrabold text-slate-900 text-sm sm:text-base">
              {invoice.student.name}
            </p>
            <p className="font-mono font-bold text-brand-700 text-xs">
              Student ID: {invoice.student.student_code}
            </p>
            <p className="font-semibold text-slate-700 text-xs">
              Course: {invoice.course?.name || "General Academic Course"}
            </p>
            {(invoice.student.phone || invoice.student.email) && (
              <p className="text-slate-500 text-xs">
                {[invoice.student.phone, invoice.student.email].filter(Boolean).join(" • ")}
              </p>
            )}
            {invoice.student.address && (
              <p className="text-slate-500 text-[11px]">{invoice.student.address}</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                PAYMENT STATUS
              </span>
              <span
                className={`inline-block px-3 py-1 text-xs font-black rounded-lg border uppercase tracking-wider ${statusBadge.style}`}
              >
                ● {statusBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 mt-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Amount Paid
                </span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {formatCurrency(invoice.paid_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Outstanding
                </span>
                <span className="font-mono font-extrabold text-brand-700 text-sm">
                  {formatCurrency(invoice.outstanding_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Details Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-900">
                  {invoice.description || "Course Tuition & Academic Fee"}
                  {invoice.course && (
                    <span className="block text-[11px] text-slate-500 font-normal">
                      Program: {invoice.course.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>

              {invoice.discount > 0 && (
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-2.5 text-purple-700 font-medium">Discount Applied</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-purple-700">
                    - {formatCurrency(invoice.discount)}
                  </td>
                </tr>
              )}

              {invoice.tax > 0 && (
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-2.5 text-indigo-700 font-medium">
                    {invoice.institute?.tax_name || "GST"} / Tax
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                    + {formatCurrency(invoice.tax)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold">
              <tr>
                <td className="px-4 py-3 text-slate-900 uppercase tracking-wide text-xs sm:text-sm">
                  Total Final Amount
                </td>
                <td className="px-4 py-3 text-right font-mono text-base font-extrabold text-slate-900">
                  {formatCurrency(invoice.final_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payments Log if available */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Payments Applied to this Invoice
            </span>
            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Receipt #</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-brand-600">
                        {p.receipt_number}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{p.payment_method}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes & Cancellation Notice */}
        {invoice.is_cancelled && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-0.5">
            <span className="font-extrabold uppercase tracking-wide block">Invoice Cancelled</span>
            <p>Reason: {invoice.cancel_reason || "Administrative cancellation"}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700 uppercase text-[10px] block mb-0.5">
              Payment Instructions / Remarks
            </span>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* Invoice Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Thank you for your timely payment.</p>
          <p className="font-mono text-[10px] text-slate-400">
            This is a computer-generated invoice from {instName}.
          </p>
        </div>
      </div>
    </Modal>
  );
}
