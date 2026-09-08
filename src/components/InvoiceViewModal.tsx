"use client";

import { useRef, useState } from "react";
import {
  Printer,
  Download,
  Share2,
  Building2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";
import Modal from "./Modal";
import { formatCurrency } from "@/lib/currency";
import {
  generateInvoiceHtml,
  printHtmlViaIframe,
  PrintableInvoiceData,
} from "@/lib/pdf-print";

export interface InvoiceViewData extends PrintableInvoiceData {}

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
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const html = generateInvoiceHtml(invoice);
    printHtmlViaIframe(html, `Fee_Invoice_${invoice.invoice_number}`);
  };

  const handleDownloadPDF = () => {
    const html = generateInvoiceHtml(invoice);
    printHtmlViaIframe(html, `Fee_Invoice_${invoice.invoice_number}`);
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
      } catch {
        // Fallback to clipboard
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
        style: "bg-emerald-50 text-emerald-800 border-emerald-300",
      };
    }
    if (isOverdue) {
      return {
        label: "OVERDUE",
        style: "bg-rose-50 text-rose-800 border-rose-300",
      };
    }
    if (invoice.paid_amount > 0) {
      return {
        label: "PARTIALLY PAID",
        style: "bg-blue-50 text-blue-800 border-blue-300",
      };
    }
    return {
      label: "UNPAID",
      style: "bg-amber-50 text-amber-800 border-amber-300",
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
            {onPaymentClick && invoice.outstanding_amount > 0 && !invoice.is_cancelled && (
              <button
                type="button"
                onClick={() => onPaymentClick(invoice)}
                className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" /> Pay Now
              </button>
            )}
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
              <Download className="w-4 h-4" /> Download PDF (A4)
            </button>
          </div>
        </div>
      }
    >
      {/* Clean Single-Page A4 Invoice Document Layout Preview */}
      <div className="text-slate-800 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 max-w-[190mm] mx-auto">
        {/* Header: Logo & Institute Info + Invoice Metadata */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3 border-b-2 border-slate-900">
          <div className="flex items-start gap-3">
            {instLogo ? (
              <img
                src={instLogo}
                alt={instName}
                className="max-h-12 max-w-[120px] object-contain rounded-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {instName}
              </h2>
              {instAddress && <p className="text-[11px] text-slate-600 leading-snug">{instAddress}</p>}
              <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2.5">
                {instPhone && <span>Phone: {instPhone}</span>}
                {instEmail && <span>Email: {instEmail}</span>}
                {instWebsite && <span>Web: {instWebsite}</span>}
              </div>
              {invoice.institute?.tax_number && (
                <p className="text-[10px] font-mono text-slate-600 font-semibold">
                  GSTIN: {invoice.institute.tax_number}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wider uppercase font-mono">
              FEE INVOICE
            </h1>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[9px] mr-1.5">Invoice No:</span>
                <span className="font-mono font-extrabold text-brand-600">
                  {invoice.invoice_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[9px] mr-1.5">Date:</span>
                <span className="font-mono text-slate-700">
                  {new Date(invoice.invoice_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[9px] mr-1.5">Due Date:</span>
                <span className="font-mono font-bold text-rose-600">
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

        {/* Bill To & Payment Status Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              BILL TO (STUDENT)
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.student.name}
            </p>
            <p className="font-mono text-xs text-slate-700">
              <strong>Student ID:</strong> {invoice.student.student_code}
            </p>
            <p className="text-xs text-slate-700">
              <strong>Course:</strong> {invoice.course?.name || "General Academic Course"}
            </p>
            {(invoice.student.phone || invoice.student.email) && (
              <p className="text-slate-500 text-[11px]">
                {[invoice.student.phone, invoice.student.email].filter(Boolean).join(" • ")}
              </p>
            )}
            {invoice.student.address && (
              <p className="text-slate-500 text-[10px]">{invoice.student.address}</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                PAYMENT STATUS
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 text-[11px] font-extrabold rounded-md border uppercase tracking-wider ${statusBadge.style}`}
              >
                ● {statusBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 mt-2 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">
                  Amount Paid
                </span>
                <span className="font-mono font-bold text-emerald-600 text-xs sm:text-sm">
                  {formatCurrency(invoice.paid_amount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">
                  Outstanding
                </span>
                <span className="font-mono font-extrabold text-rose-600 text-xs sm:text-sm">
                  {formatCurrency(invoice.outstanding_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Itemized Table */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="px-3 py-2.5 text-slate-900">
                  <div className="font-bold">{invoice.description || "Course Tuition & Academic Fee"}</div>
                  {invoice.course && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      Program: {invoice.course.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>

              {invoice.discount > 0 && (
                <tr className="bg-slate-50/50">
                  <td className="px-3 py-1.5 text-purple-700 font-medium text-[11px]">
                    Scholarship / Discount Applied
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-purple-700 text-[11px]">
                    - {formatCurrency(invoice.discount)}
                  </td>
                </tr>
              )}

              {invoice.tax > 0 && (
                <tr className="bg-slate-50/50">
                  <td className="px-3 py-1.5 text-indigo-700 font-medium text-[11px]">
                    {invoice.institute?.tax_name || "GST"} / Tax
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-indigo-700 text-[11px]">
                    + {formatCurrency(invoice.tax)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold">
              <tr>
                <td className="px-3 py-2 text-slate-900 uppercase tracking-wide text-xs">
                  Total Final Amount
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm sm:text-base font-black text-slate-900">
                  {formatCurrency(invoice.final_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payments Log if available */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Payments Applied to this Invoice
            </span>
            <div className="rounded-md border border-slate-200 overflow-hidden text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[9px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-2.5 py-1.5">Receipt #</th>
                    <th className="px-2.5 py-1.5">Date</th>
                    <th className="px-2.5 py-1.5">Method</th>
                    <th className="px-2.5 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.payments.map((p) => (
                    <tr key={p.id || p.receipt_number} className="hover:bg-slate-50">
                      <td className="px-2.5 py-1.5 font-mono font-bold text-brand-600">
                        {p.receipt_number}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-slate-600">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-700">{p.payment_method}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cancellation or Notes */}
        {invoice.is_cancelled && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-0.5">
            <span className="font-extrabold uppercase tracking-wide block text-[10px]">
              Invoice Cancelled
            </span>
            <p>Reason: {invoice.cancel_reason || "Administrative cancellation"}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700 uppercase text-[9px] block mb-0.5">
              Payment Instructions / Remarks
            </span>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-500">
          <p className="font-medium text-slate-600">Thank you for choosing {instName}.</p>
          <p className="font-mono text-slate-400">
            Official Computer-Generated Document • No Signature Required
          </p>
        </div>
      </div>
    </Modal>
  );
}
