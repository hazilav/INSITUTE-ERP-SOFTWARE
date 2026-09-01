"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";

interface FeePlanOption {
  id: string;
  student: { name: string; student_code: string };
  course: { name: string };
  total_amount: number;
  balance: number;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptData?: any) => void;
  preselectedPlanId?: string;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPlanId,
}: RecordPaymentModalProps) {
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(preselectedPlanId || "");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      fetch("/api/fees")
        .then((r) => r.json())
        .then((d) => {
          if (d.feeAccounts) {
            const activePlans = d.feeAccounts.filter(
              (p: any) => p.status !== "PAID" && p.balance > 0
            );
            setFeePlans(activePlans);
            if (preselectedPlanId) {
              const matched = activePlans.find((p: any) => p.id === preselectedPlanId);
              if (matched) {
                setSelectedPlanId(matched.id);
                setAmount(String(matched.balance));
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, preselectedPlanId]);

  if (!isOpen) return null;

  const currentPlan = feePlans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!selectedPlanId) throw new Error("Please select a student fee account.");
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) throw new Error("Please enter a valid payment amount.");
      if (currentPlan && amtNum > currentPlan.balance + 1) {
        throw new Error(`Amount cannot exceed the remaining balance of ${formatCurrency(currentPlan.balance)}.`);
      }

      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_plan_id: selectedPlanId,
          amount: amtNum,
          payment_mode: paymentMode,
          transaction_ref: transactionRef || undefined,
          payment_date: paymentDate,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment.");

      onSuccess(data.receipt);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while recording payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fee Payment"
      subtitle="Collect fee payment and generate printable receipt"
      icon={<CreditCard className="w-5 h-5 text-brand-600" />}
      maxWidth="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Record Payment & Generate Receipt"
            )}
          </button>
        </div>
      }
    >
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Fee Account / Student <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={selectedPlanId}
            onChange={(e) => {
              setSelectedPlanId(e.target.value);
              const p = feePlans.find((plan) => plan.id === e.target.value);
              if (p) setAmount(String(p.balance));
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          >
            <option value="">Select student account...</option>
            {feePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.student.name} ({p.student.student_code}) — {p.course.name} [Bal: {formatCurrency(p.balance)}]
              </option>
            ))}
          </select>
        </div>

        {currentPlan && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-500 font-medium">Outstanding Balance:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(currentPlan.balance)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold"
            >
              <option value="CASH">💵 Cash</option>
              <option value="UPI">📱 UPI / QR</option>
              <option value="BANK_TRANSFER">🏦 Bank Transfer (NEFT/IMPS)</option>
              <option value="CHEQUE">📄 Cheque</option>
              <option value="CARD">💳 Debit/Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transaction / Ref No.
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UTR123456789 or Cheque #0012"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Notes / Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid part payment for April installment"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>
      </form>
    </Modal>
  );
}
