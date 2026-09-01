"use client";

import { useRef } from "react";
import { X, Printer, CheckCircle2, Building2 } from "lucide-react";

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

  const prevBal = receiptData.previous_balance !== undefined
    ? receiptData.previous_balance
    : receiptData.remaining_balance + receiptData.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Receipt Container */}
        <div ref={receiptRef} className="space-y-6 text-slate-800">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              {receiptData.institute_logo ? (
                <img src={receiptData.institute_logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg leading-tight">{receiptData.institute_name}</h2>
                <p className="text-[11px] text-slate-500 font-mono tracking-wider uppercase">OFFICIAL PAYMENT RECEIPT</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">RECEIPT NO.</span>
              <span className="font-mono font-extrabold text-brand-600 text-sm">{receiptData.receipt_number}</span>
            </div>
          </div>

          {/* Student & Payment Detail Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">PAID BY STUDENT</span>
              <p className="font-bold text-slate-900 text-sm">{receiptData.student.name}</p>
              <p className="font-mono text-brand-600 font-bold">ID: {receiptData.student.student_code}</p>
              <p className="text-slate-500">{receiptData.student.phone}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">TRANSACTION DETAILS</span>
              <p className="font-semibold text-slate-800">Course: {receiptData.course_name}</p>
              <p className="font-mono text-slate-600">Date: {new Date(receiptData.payment_date).toLocaleDateString()}</p>
              <p className="font-mono text-slate-600">Method: {receiptData.payment_method}</p>
              {receiptData.reference_number && (
                <p className="font-mono text-slate-500">Ref: {receiptData.reference_number}</p>
              )}
            </div>
          </div>

          {/* Amount Summary Box */}
          <div className="p-5 rounded-2xl bg-brand-50/80 border border-brand-200 space-y-3">
            <div className="flex justify-between items-center text-xs text-brand-900 border-b border-brand-200/60 pb-2">
              <span>Previous Balance</span>
              <span className="font-mono font-bold">${prevBal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-extrabold text-brand-950 text-sm uppercase">AMOUNT PAID</span>
              <span className="font-mono font-extrabold text-brand-700 text-2xl">${receiptData.amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-brand-900 border-t border-brand-200/60 pt-2">
              <span>Remaining Balance</span>
              <span className="font-mono font-bold text-slate-900">${receiptData.remaining_balance.toFixed(2)}</span>
            </div>
          </div>

          {receiptData.notes && (
            <div className="text-xs text-slate-500 italic">
              Notes: "{receiptData.notes}"
            </div>
          )}

          {/* Footer Sign-off */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-100 text-[11px] text-slate-400">
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

        {/* Action Controls */}
        <div className="flex gap-3 pt-6 border-t border-slate-100 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 inline-flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
