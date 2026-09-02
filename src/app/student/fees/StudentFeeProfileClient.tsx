"use client";

import { useState } from "react";
import { BadgeDollarSign, Clock, Printer, CreditCard, CheckCircle2 } from "lucide-react";
import PaymentReceiptModal from "@/components/PaymentReceiptModal";
import { formatCurrency } from "@/lib/currency";

interface StudentFeeProfileClientProps {
  feePlan: any;
  student: {
    student_code: string;
    name: string;
    phone: string;
    email?: string | null;
    course_name: string;
  };
  instituteName: string;
}

export default function StudentFeeProfileClient({
  feePlan,
  student,
  instituteName,
}: StudentFeeProfileClientProps) {
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Tuition Fees & Receipts
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Authorized fee plan, installment schedules, and payment receipts
        </p>
      </div>

      {feePlan ? (
        <>
          {/* Fee Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Course Fee</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">
                {formatCurrency(feePlan.course_fee)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Discount</span>
              <p className="text-xl font-extrabold text-purple-600 mt-0.5 font-mono">
                {feePlan.discount_type === "percentage"
                  ? `${feePlan.discount_value}%`
                  : formatCurrency(feePlan.discount_value)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Final Fee</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">
                {formatCurrency(feePlan.final_fee)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Amount Paid</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5 font-mono">
                {formatCurrency(feePlan.amount_paid)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Balance Due</span>
              <p className="text-xl font-extrabold text-rose-600 mt-0.5 font-mono">
                {formatCurrency(feePlan.balance)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Status</span>
              <p className="text-sm font-extrabold text-slate-800 mt-1 capitalize">
                {feePlan.status}
              </p>
            </div>
          </div>

          {/* Payment Schedule Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-base">Payment Schedule</h3>
            </div>

            {feePlan.installments.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Installment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {feePlan.installments.map((inst: any) => (
                      <tr key={inst.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-bold text-slate-900">{inst.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inst.amount)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {new Date(inst.due_date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right">
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
            ) : (
              <p className="text-xs text-slate-400">Single full payment plan.</p>
            )}
          </div>

          {/* Payment Receipts History Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <Printer className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Payment History Log & Receipts</h3>
            </div>

            {feePlan.payments.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Receipt #</th>
                      <th className="px-4 py-3 text-right">Amount Paid</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Ref #</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {feePlan.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-brand-600">{p.receipt_number}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-3">{p.payment_method}</td>
                        <td className="px-4 py-3 font-mono">
                          {new Date(p.payment_date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">{p.reference_number || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedReceipt({
                                ...p,
                                student: {
                                  student_code: student.student_code,
                                  name: student.name,
                                  phone: student.phone,
                                  email: student.email,
                                },
                                course_name: student.course_name,
                                remaining_balance: feePlan.balance,
                                recorded_by_name: p.recorded_by?.name || "Staff",
                                institute_name: instituteName,
                              });
                              setReceiptModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                          >
                            <Printer className="w-3.5 h-3.5" /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No fee payments recorded yet.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <BadgeDollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Fee Information Available</h3>
          <p className="text-xs text-slate-500">
            Fee plan has not been generated for your account yet. Contact your institute.
          </p>
        </div>
      )}

      <PaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
