"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, Receipt, User, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";

export interface InvoiceOption {
  id: string;
  invoice_number: string;
  final_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  student: {
    id: string;
    student_code: string;
    name: string;
  };
  course?: { name: string } | null;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptData?: any) => void;
  preselectedInvoiceId?: string;
  preselectedStudentId?: string;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedInvoiceId,
  preselectedStudentId,
}: RecordPaymentModalProps) {
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preselectedInvoiceId || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setFetching(true);
      const url = preselectedStudentId
        ? `/api/invoices?student_id=${preselectedStudentId}&limit=100`
        : `/api/invoices?limit=150`;

      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          if (d.invoices) {
            // Filter out cancelled or already paid invoices unless preselected
            const payable = d.invoices.filter(
              (inv: any) =>
                !inv.is_cancelled &&
                (inv.outstanding_amount > 0.001 || inv.id === preselectedInvoiceId)
            );
            setInvoices(payable);

            if (preselectedInvoiceId) {
              const matched = payable.find((i: any) => i.id === preselectedInvoiceId);
              if (matched) {
                setSelectedInvoiceId(matched.id);
                setAmount(String(matched.outstanding_amount));
              }
            } else if (payable.length > 0 && !selectedInvoiceId) {
              setSelectedInvoiceId(payable[0].id);
              setAmount(String(payable[0].outstanding_amount));
            }
          }
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [isOpen, preselectedInvoiceId, preselectedStudentId]);

  if (!isOpen) return null;

  const currentInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const matched = invoices.find((i) => i.id === invId);
    if (matched) {
      setAmount(String(matched.outstanding_amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedInvoiceId) {
      setError("Please select an invoice.");
      return;
    }

    if (!currentInvoice) {
      setError("Selected invoice could not be found.");
      return;
    }

    if (currentInvoice.status === "Paid" || currentInvoice.outstanding_amount <= 0.001) {
      setError("This invoice is already fully paid.");
      return;
    }

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError("Payment amount must be greater than ₹0.");
      return;
    }

    if (amtNum > currentInvoice.outstanding_amount + 0.01) {
      setError(
        `Payment amount cannot exceed the remaining outstanding balance of ${formatCurrency(
          currentInvoice.outstanding_amount
        )}.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoiceId,
          amount: amtNum,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          payment_date: paymentDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment.");
      }

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
      title="Record Student Payment"
      subtitle="Collect payment against student invoice and generate official receipt"
      icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
      maxWidth="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="record-payment-form"
            disabled={loading || fetching || (currentInvoice && currentInvoice.outstanding_amount <= 0.001)}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" /> Save & Generate Receipt
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Invoice Dropdown */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Select Invoice to Pay <span className="text-rose-500">*</span>
          </label>
          {fetching ? (
            <div className="p-3 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              Loading available invoices...
            </div>
          ) : invoices.length > 0 ? (
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="">-- Choose Invoice --</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.student.name} ({inv.student.student_code}) • Due:{" "}
                  {formatCurrency(inv.outstanding_amount)}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 text-center text-slate-500 text-xs bg-amber-50 rounded-xl border border-amber-200">
              No outstanding unpaid invoices found. Create an invoice first.
            </div>
          )}
        </div>

        {/* Selected Invoice Overview Banner */}
        {currentInvoice && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student</span>
                <p className="font-extrabold text-slate-900 text-sm">{currentInvoice.student.name}</p>
                <p className="font-mono text-brand-700 font-bold">
                  ID: {currentInvoice.student.student_code}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {currentInvoice.invoice_number}
                </span>
                <p className="text-slate-500">{currentInvoice.course?.name || "General Course"}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(currentInvoice.final_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatCurrency(currentInvoice.paid_amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Remaining
                </span>
                <span className="font-mono font-extrabold text-brand-700">
                  {formatCurrency(currentInvoice.outstanding_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Amount & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-mono font-bold"
            />
            {currentInvoice && currentInvoice.outstanding_amount > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(currentInvoice.outstanding_amount))}
                className="text-[11px] text-emerald-600 font-semibold hover:underline mt-1 cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(currentInvoice.outstanding_amount)})
              </button>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Date & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Transaction / Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI-99882233, Cheque #1024"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Payment Notes / Remarks (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Paid in cash at reception counter."
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          />
        </div>
      </form>
    </Modal>
  );
}
