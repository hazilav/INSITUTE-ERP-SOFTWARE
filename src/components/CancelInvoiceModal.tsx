"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    student_name: string;
    final_amount: number;
    paid_amount: number;
  } | null;
}

export default function CancelInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoice,
}: CancelInvoiceModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for cancelling this invoice.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel invoice.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Invoice"
      subtitle={`Cancel fee invoice #${invoice.invoice_number}`}
      icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
      maxWidth="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            type="submit"
            form="cancel-invoice-form"
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      }
    >
      <form id="cancel-invoice-form" onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
          <p className="font-bold">Important Notice:</p>
          <p>
            Cancelling this invoice will mark it as cancelled across all portal views. The historical
            record and audit log will be safely preserved.
          </p>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Reason for Cancellation <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="e.g. Student course change, billing adjustment, duplicate entry"
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
          />
        </div>
      </form>
    </Modal>
  );
}
