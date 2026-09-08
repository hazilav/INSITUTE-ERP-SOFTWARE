"use client";

import { useRef, useState } from "react";
import {
  Printer,
  Download,
  Share2,
  Building2,
  Receipt,
  CheckCircle2,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";
import {
  generateReceiptHtml,
  printHtmlViaIframe,
  PrintableReceiptData,
} from "@/lib/pdf-print";

export interface ReceiptData extends PrintableReceiptData {}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  receiptData,
}: PaymentReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    const html = generateReceiptHtml(receiptData);
    printHtmlViaIframe(html, `Payment_Receipt_${receiptData.receipt_number}`);
  };

  const handleDownloadPDF = () => {
    const html = generateReceiptHtml(receiptData);
    printHtmlViaIframe(html, `Payment_Receipt_${receiptData.receipt_number}`);
  };

  const handleShare = async () => {
    const shareText = `Payment Receipt #${receiptData.receipt_number} for ${receiptData.student.name} - Amount Received: ${formatCurrency(receiptData.amount)}, Remaining Balance: ${formatCurrency(receiptData.remaining_balance)}.`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment Receipt #${receiptData.receipt_number}`,
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

  const thisPayment =
    receiptData.this_payment !== undefined
      ? receiptData.this_payment
      : receiptData.amount;
  const remBal =
    receiptData.remaining_balance !== undefined
      ? receiptData.remaining_balance
      : 0;
  const prevPaid =
    receiptData.previously_paid !== undefined
      ? receiptData.previously_paid
      : 0;
  const invTotal =
    receiptData.invoice_total !== undefined
      ? receiptData.invoice_total
      : prevPaid + thisPayment + remBal;

  const isPaidInFull = remBal <= 0.001;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payment Receipt #${receiptData.receipt_number}`}
      subtitle={`Official fee receipt for ${receiptData.student.name}`}
      icon={<Receipt className="w-5 h-5 text-brand-600" />}
      maxWidth="2xl"
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
              <Download className="w-4 h-4" /> Download PDF (A4)
            </button>
          </div>
        </div>
      }
    >
      {/* Clean Single-Page A4 Payment Receipt Layout Preview */}
      <div className="text-slate-800 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-3.5 max-w-[190mm] mx-auto">
        {/* Header Banner: Logo + Institute + Title */}
        <div className="flex flex-col sm:flex-row items-start justify-between pb-3 border-b-2 border-slate-900 gap-3">
          <div className="flex items-start gap-3">
            {receiptData.institute_logo ? (
              <img
                src={receiptData.institute_logo}
                alt="Logo"
                className="max-h-12 max-w-[120px] object-contain rounded-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {receiptData.institute_name}
              </h2>
              {receiptData.institute_address && (
                <p className="text-[11px] text-slate-500 leading-snug">{receiptData.institute_address}</p>
              )}
              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2.5">
                {receiptData.institute_phone && <span>Phone: {receiptData.institute_phone}</span>}
                {receiptData.institute_email && <span>Email: {receiptData.institute_email}</span>}
              </div>
              {receiptData.institute_tax_number && (
                <p className="text-[10px] font-mono text-slate-600 font-semibold">
                  GSTIN: {receiptData.institute_tax_number}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wider uppercase font-mono">
              PAYMENT RECEIPT
            </h1>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[9px] mr-1.5">Receipt No:</span>
                <span className="font-mono font-extrabold text-emerald-700">
                  {receiptData.receipt_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold text-[9px] mr-1.5">Date:</span>
                <span className="font-mono text-slate-700">
                  {new Date(receiptData.payment_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Amount Received Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider block">
              AMOUNT RECEIVED
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Method: <strong>{receiptData.payment_method}</strong>
              {receiptData.reference_number && ` • Ref: ${receiptData.reference_number}`}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {formatCurrency(thisPayment)}
          </div>
        </div>

        {/* Two-Column Grid: Received From + Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              RECEIVED FROM (STUDENT)
            </span>
            <p className="font-bold text-slate-900 text-sm">{receiptData.student.name}</p>
            <p className="font-mono text-slate-700">
              <strong>Student ID:</strong> {receiptData.student.student_code}
            </p>
            <p className="text-slate-700">
              <strong>Course:</strong> {receiptData.course_name}
            </p>
            {(receiptData.student.phone || receiptData.student.email) && (
              <p className="text-slate-500 text-[11px]">
                {[receiptData.student.phone, receiptData.student.email].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              PAYMENT DETAILS
            </span>
            <p className="font-mono text-slate-700">
              <strong>Invoice #:</strong> {receiptData.invoice_number || "Direct Account Credit"}
            </p>
            <p className="text-slate-700">
              <strong>Payment Date:</strong>{" "}
              {new Date(receiptData.payment_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-slate-700">
              <strong>Method:</strong> {receiptData.payment_method}
            </p>
            {receiptData.reference_number && (
              <p className="font-mono text-slate-700">
                <strong>Reference #:</strong> {receiptData.reference_number}
              </p>
            )}
            {receiptData.recorded_by_name && (
              <p className="text-slate-500 text-[11px]">
                <strong>Received By:</strong> {receiptData.recorded_by_name}
              </p>
            )}
          </div>
        </div>

        {/* Financial Summary Breakdown Card */}
        <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-bold uppercase tracking-wider text-[10px]">
            PAYMENT & BALANCE RECONCILIATION
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-2 text-slate-600">Total Course / Invoice Fee</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(invTotal)}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-600">Previously Paid</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                  {formatCurrency(prevPaid)}
                </td>
              </tr>
              <tr className="bg-emerald-50/40">
                <td className="px-3 py-2 font-bold text-emerald-800">This Payment Received</td>
                <td className="px-3 py-2 text-right font-mono font-black text-emerald-800 text-xs sm:text-sm">
                  {formatCurrency(thisPayment)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td
                  className={`px-3 py-2 ${
                    isPaidInFull ? "text-emerald-800" : "text-rose-700"
                  }`}
                >
                  {isPaidInFull ? "Balance Remaining (Paid in Full)" : "Balance Remaining"}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono text-xs sm:text-sm font-black ${
                    isPaidInFull ? "text-emerald-800" : "text-rose-700"
                  }`}
                >
                  {formatCurrency(remBal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Account Standing Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <span className="font-bold text-slate-600 uppercase text-[10px]">
            Account Standing:
          </span>
          <span
            className={`px-2.5 py-0.5 text-[11px] font-extrabold rounded border uppercase tracking-wider ${
              isPaidInFull
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-blue-100 text-blue-800 border-blue-300"
            }`}
          >
            ● {isPaidInFull ? "PAID IN FULL" : "PARTIALLY PAID"}
          </span>
        </div>

        {receiptData.notes && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700 uppercase text-[9px] block mb-0.5">
              Remarks
            </span>
            <p>{receiptData.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-500">
          <p className="font-medium text-slate-600">
            Thank you for your payment to {receiptData.institute_name}.
          </p>
          <p className="font-mono text-slate-400">Official Payment Receipt • Computer Generated</p>
        </div>
      </div>
    </Modal>
  );
}
