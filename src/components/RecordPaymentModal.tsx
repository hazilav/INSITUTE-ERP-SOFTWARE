"use client";

import { useState, useEffect } from "react";
import {
  X,
  BadgeDollarSign,
  AlertCircle,
  Calendar,
  CreditCard,
} from "lucide-react";

interface FeePlanItem {
  id: string;
  balance: number;
  student: {
    id: string;
    name: string;
    student_code: string;
  };
  course: { name: string };
  installments: Array<{ id: string; name: string; amount: number; status: string }>;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedFeePlanId?: string;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedFeePlanId,
}: RecordPaymentModalProps) {
  const [feePlans, setFeePlans] = useState<FeePlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/fees")
        .then((r) => r.json())
        .then((d) => {
          if (d.feePlans) {
            const activePlans = d.feePlans.filter((p: FeePlanItem) => p.balance > 0);
            setFeePlans(activePlans);

            if (preselectedFeePlanId) {
              setSelectedPlanId(preselectedFeePlanId);
              const p = activePlans.find((plan: FeePlanItem) => plan.id === preselectedFeePlanId);
              if (p) setAmount(String(p.balance));
            } else if (activePlans.length > 0) {
              setSelectedPlanId(activePlans[0].id);
              setAmount(String(activePlans[0].balance));
            }
          }
        });
    }
  }, [isOpen, preselectedFeePlanId]);

  if (!isOpen) return null;

  const currentPlan = feePlans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error("Please enter a valid amount greater than 0.");
      if (currentPlan && amt > currentPlan.balance + 0.01) {
        throw new Error(`Payment amount ($${amt}) cannot exceed remaining balance ($${currentPlan.balance}).`);
      }

      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_plan_id: selectedPlanId,
          installment_id: installmentId || null,
          amount: amt,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Record Fee Payment</h3>
            <p className="text-xs text-slate-500">Log student payment transaction & update balance automatically</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Fee Account / Student <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                const p = feePlans.find((plan) => plan.id === e.target.value);
                if (p) setAmount(String(p.balance));
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="">Select student account...</option>
              {feePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.student.name} ({p.student.student_code}) — {p.course.name} [Bal: ${p.balance}]
                </option>
              ))}
            </select>
          </div>

          {currentPlan && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
              <span className="text-slate-500 font-medium">Outstanding Balance:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">${currentPlan.balance.toFixed(2)}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono font-bold"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Online Payment">Online Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reference / Txn ID
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UPI/987654321"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received full installment 1"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Record Payment & Generate Receipt"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
