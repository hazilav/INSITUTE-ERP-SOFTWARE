"use client";

import { useRef, useState } from "react";
import { Printer, Download, Share2, Building2, Receipt, CheckCircle2, Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";

export interface ReceiptData {
  id?: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  student: {
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  course_name: string;
  invoice_number?: string | null;
  invoice_total?: number;
  previously_paid?: number;
  this_payment?: number;
  remaining_balance: number;
  status?: string;
  recorded_by_name?: string;
  institute_name: string;
  institute_logo?: string | null;
  institute_address?: string | null;
  institute_phone?: string | null;
  institute_email?: string | null;
}

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
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
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
      } catch (err) {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const thisPayment = receiptData.this_payment !== undefined ? receiptData.this_payment : receiptData.amount;
  const remBal = receiptData.remaining_balance !== undefined ? receiptData.remaining_balance : 0;
  const prevPaid = receiptData.previously_paid !== undefined ? receiptData.previously_paid : 0;
  const invTotal = receiptData.invoice_total !== undefined ? receiptData.invoice_total : prevPaid + thisPayment + remBal;

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
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      }
    >
      {/* Professional A4 Payment Receipt Layout */}
      <div
        ref={receiptRef}
        className="space-y-5 text-slate-800 bg-white p-4 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs print:p-0 print:border-none print:shadow-none"
      >
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start justify-between pb-5 border-b-2 border-slate-900 gap-3">
          <div className="flex items-start gap-3">
            {receiptData.institute_logo ? (
              <img
                src={receiptData.institute_logo}
                alt="Logo"
                className="w-12 h-12 rounded-xl object-contain border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {receiptData.institute_name}
              </h2>
              {receiptData.institute_address && (
                <p className="text-[11px] text-slate-500">{receiptData.institute_address}</p>
              )}
              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2">
                {receiptData.institute_phone && <span>Phone: {receiptData.institute_phone}</span>}
                {receiptData.institute_email && <span>Email: {receiptData.institute_email}</span>}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-wider uppercase font-mono">
              PAYMENT RECEIPT
            </h3>
            <div className="text-xs space-y-0.5 mt-1">
              <div className="flex sm:justify-end gap-1.5">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Receipt #:</span>
                <span className="font-mono font-extrabold text-brand-700">
                  {receiptData.receipt_number}
                </span>
              </div>
              <div className="flex sm:justify-end gap-1.5">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Receipt Date:</span>
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

        {/* Received From & Payment Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              RECEIVED FROM (STUDENT)
            </span>
            <p className="font-extrabold text-slate-900 text-sm">
              {receiptData.student.name}
            </p>
            <p className="font-mono font-bold text-brand-700 text-xs">
              Student ID: {receiptData.student.student_code}
            </p>
            <p className="text-slate-700 font-medium">
              Course: {receiptData.course_name}
            </p>
            {receiptData.student.phone && (
              <p className="text-slate-500 text-[11px]">{receiptData.student.phone}</p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              PAYMENT TRANSACTION DETAILS
            </span>
            {receiptData.invoice_number && (
              <p className="font-mono font-bold text-slate-800">
                Invoice: <span className="text-brand-700">#{receiptData.invoice_number}</span>
              </p>
            )}
            <p className="font-semibold text-slate-800">
              Payment Method: <span className="font-bold">{receiptData.payment_method}</span>
            </p>
            {receiptData.reference_number && (
              <p className="font-mono text-slate-600">
                Ref / Txn ID: {receiptData.reference_number}
              </p>
            )}
            <p className="font-mono text-slate-500 text-[11px]">
              Payment Date: {new Date(receiptData.payment_date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Amount Received Hero Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-center space-y-1">
          <span className="text-xs uppercase font-extrabold text-emerald-800 tracking-wider">
            AMOUNT RECEIVED
          </span>
          <p className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-tight">
            {formatCurrency(thisPayment)}
          </p>
          <p className="text-[11px] text-emerald-800 font-medium">
            Payment successfully recorded & validated
          </p>
        </div>

        {/* Financial Breakdown Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs sm:text-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Financial Summary Item</th>
                <th className="px-4 py-2.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2.5 text-slate-700">Invoice Total Amount</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(invTotal)}
                </td>
              </tr>
              {prevPaid > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-slate-700">Previously Paid Amount</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-700">
                    {formatCurrency(prevPaid)}
                  </td>
                </tr>
              )}
              <tr className="bg-emerald-50/50">
                <td className="px-4 py-2.5 text-emerald-900 font-bold">This Payment</td>
                <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">
                  {formatCurrency(thisPayment)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td className="px-4 py-3 text-slate-900 uppercase">Remaining Balance Due</td>
                <td className="px-4 py-3 text-right font-mono text-base font-extrabold text-brand-700">
                  {formatCurrency(remBal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase">Invoice Status:</span>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
              isPaidInFull
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-blue-100 text-blue-800 border-blue-300"
            }`}
          >
            ● {isPaidInFull ? "PAID IN FULL" : "PARTIALLY PAID"}
          </span>
        </div>

        {receiptData.notes && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700 uppercase text-[10px] block mb-0.5">
              Payment Remarks
            </span>
            <p>{receiptData.notes}</p>
          </div>
        )}

        {/* Footer & Signature */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="space-y-0.5 text-left w-full sm:w-auto">
            {receiptData.recorded_by_name && (
              <p className="text-[11px] text-slate-600">
                Received & Verified by: <span className="font-bold text-slate-800">{receiptData.recorded_by_name}</span>
              </p>
            )}
            <p className="font-mono text-[10px] text-slate-400">
              Authorized computer-generated receipt from {receiptData.institute_name}
            </p>
          </div>
          <div className="text-right sm:w-40 border-t border-dashed sm:border-t-0 pt-2 sm:pt-0 w-full">
            <div className="h-8 flex items-end justify-end">
              <span className="text-[10px] font-mono text-slate-400 italic">Authorized Seal / Signature</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
