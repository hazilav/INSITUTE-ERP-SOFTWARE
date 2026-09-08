"use client";

import { useState } from "react";
import { AlertTriangle, Undo2 } from "lucide-react";
import Modal from "./Modal";
import { formatCurrency } from "@/lib/currency";

interface VoidPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment: {
    id: string;
    receipt_number: string;
    amount: number;
    student_name?: string;
  } | null;
}

export default function VoidPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  payment,
}: VoidPaymentModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for voiding this payment.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/fees/payments/${payment.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to void payment.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to void payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Void / Cancel Payment"
      subtitle={`Void payment receipt #${payment.receipt_number}`}
      icon={<Undo2 className="w-5 h-5 text-rose-600" />}
      maxWidth="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Keep Payment
          </button>
          <button
            type="submit"
            form="void-payment-form"
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Voiding..." : "Confirm Void"}
          </button>
        </div>
      }
    >
      <form id="void-payment-form" onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-1">
          <p className="font-bold">Important Audit Warning:</p>
          <p>
            Voiding this receipt ({payment.receipt_number}) for{" "}
            <strong>{formatCurrency(payment.amount)}</strong> will reverse the payment credit, update
            the invoice balance, and permanently log an audit entry.
          </p>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Reason for Voiding Payment <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="e.g. Bounced cheque, payment entered in error, duplicate entry"
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
          />
        </div>
      </form>
    </Modal>
  );
}
