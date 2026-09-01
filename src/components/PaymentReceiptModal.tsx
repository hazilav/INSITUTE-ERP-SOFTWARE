"use client";

import { useRef } from "react";
import { Printer, CheckCircle2, Building2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
    notes?: string | null;
    student: {
      student_code: string;
      name: string;
      phone: string;
      email?: string | null;
    };
    course_name: string;
    previous_balance?: number;
    remaining_balance: number;
    recorded_by_name?: string;
    institute_name: string;
    institute_logo?: string | null;
  } | null;
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  receiptData,
}: PaymentReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const prevBal =
    receiptData.previous_balance !== undefined
      ? receiptData.previous_balance
      : receiptData.remaining_balance + receiptData.amount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payment Receipt #${receiptData.receipt_number}`}
      subtitle={`Official fee receipt for ${receiptData.student.name}`}
      icon={<Receipt className="w-5 h-5 text-brand-600" />}
      maxWidth="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      }
    >
      <div ref={receiptRef} className="space-y-4 text-slate-800">
        {/* Header Banner */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
          <div className="flex items-center gap-2.5">
            {receiptData.institute_logo ? (
              <img
                src={receiptData.institute_logo}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                {receiptData.institute_name}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                OFFICIAL PAYMENT RECEIPT
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">
              RECEIPT NO.
            </span>
            <span className="font-mono font-extrabold text-brand-600 text-xs sm:text-sm">
              {receiptData.receipt_number}
            </span>
          </div>
        </div>

        {/* Student & Payment Detail Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              PAID BY STUDENT
            </span>
            <p className="font-bold text-slate-900 text-xs sm:text-sm">
              {receiptData.student.name}
            </p>
            <p className="font-mono text-brand-600 font-bold text-xs">
              ID: {receiptData.student.student_code}
            </p>
            <p className="text-slate-500">{receiptData.student.phone}</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              TRANSACTION DETAILS
            </span>
            <p className="font-semibold text-slate-800">
              Course: {receiptData.course_name}
            </p>
            <p className="font-mono text-slate-600">
              Date: {new Date(receiptData.payment_date).toLocaleDateString("en-IN")}
            </p>
            <p className="font-mono text-slate-600">
              Method: {receiptData.payment_method}
            </p>
            {receiptData.reference_number && (
              <p className="font-mono text-slate-500">
                Ref: {receiptData.reference_number}
              </p>
            )}
          </div>
        </div>

        {/* Amount Summary Box */}
        <div className="p-4 rounded-2xl bg-brand-50/80 border border-brand-200 space-y-2">
          <div className="flex justify-between items-center text-xs text-brand-900 border-b border-brand-200/60 pb-1.5">
            <span>Previous Balance</span>
            <span className="font-mono font-bold">{formatCurrency(prevBal)}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="font-extrabold text-brand-950 text-xs sm:text-sm uppercase">
              AMOUNT PAID
            </span>
            <span className="font-mono font-extrabold text-brand-700 text-xl sm:text-2xl">
              {formatCurrency(receiptData.amount)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-brand-900 border-t border-brand-200/60 pt-1.5">
            <span>Remaining Balance</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(receiptData.remaining_balance)}
            </span>
          </div>
        </div>

        {receiptData.notes && (
          <div className="text-xs text-slate-500 italic">
            Notes: "{receiptData.notes}"
          </div>
        )}

        {/* Footer Sign-off */}
        <div className="flex justify-between items-end pt-3 border-t border-slate-100 text-[11px] text-slate-400">
          <div>
            <p className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Payment Verified
            </p>
            <p>Recorded by: {receiptData.recorded_by_name || "Authorized Staff"}</p>
          </div>
          <div className="text-right">
            <p className="font-mono">Thank you for your payment!</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
