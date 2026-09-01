"use client";

import { useState, useEffect } from "react";
import {
  X,
  BadgeDollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Users,
} from "lucide-react";
import { calculateFinalFee } from "@/lib/finance";
import { formatCurrency } from "@/lib/currency";

interface OptionItem {
  id: string;
  name: string;
  student_code?: string;
  course_id?: string;
  batch_id?: string;
}

interface InstallmentRow {
  name: string;
  amount: string;
  due_date: string;
}

interface CreateFeePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateFeePlanModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFeePlanModalProps) {
  const [students, setStudents] = useState<OptionItem[]>([]);
  const [courses, setCourses] = useState<OptionItem[]>([]);

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseFee, setCourseFee] = useState("50000");
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState("0");
  const [paymentType, setPaymentType] = useState("full");

  // Installments state
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { name: "Installment 1", amount: "25000", due_date: new Date().toISOString().split("T")[0] },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalFee = calculateFinalFee(
    parseFloat(courseFee) || 0,
    discountType,
    parseFloat(discountValue) || 0
  );

  useEffect(() => {
    if (isOpen) {
      fetch("/api/students")
        .then((r) => r.json())
        .then((d) => {
          if (d.students) setStudents(d.students);
        });

      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) setCourses(d.courses);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddInstallment = () => {
    const nextIdx = installments.length + 1;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30 * nextIdx);

    setInstallments([
      ...installments,
      {
        name: `Installment ${nextIdx}`,
        amount: "0",
        due_date: defaultDate.toISOString().split("T")[0],
      },
    ]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(installments.filter((_, idx) => idx !== index));
  };

  const handleInstallmentChange = (index: number, field: keyof InstallmentRow, val: string) => {
    const updated = [...installments];
    updated[index][field] = val;
    setInstallments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (paymentType === "installments") {
        let instTotal = 0;
        installments.forEach((i) => {
          instTotal += parseFloat(i.amount || "0");
        });

        if (Math.abs(instTotal - finalFee) > 0.5) {
          throw new Error(`Sum of installment amounts (${formatCurrency(instTotal)}) must equal the Final Fee (${formatCurrency(finalFee)}).`);
        }
      }

      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_id: courseId,
          course_fee: parseFloat(courseFee),
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          payment_type: paymentType,
          installments_data: installments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create fee plan");

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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Create Student Fee Plan</h3>
            <p className="text-xs text-slate-500">Assign course fees, discounts, and payment installment schedules</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  const st = students.find((s) => s.id === e.target.value);
                  if (st && st.course_id) setCourseId(st.course_id);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.student_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Total Course Fee (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={courseFee}
                onChange={(e) => setCourseFee(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Discount Value
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Final Fee Summary Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">Calculated Final Fee</span>
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">{formatCurrency(finalFee)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Schedule Type
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="full">Full Single Payment</option>
              <option value="installments">Multiple Installments</option>
            </select>
          </div>

          {/* Installment Builder */}
          {paymentType === "installments" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Installments Schedule</span>
                <button
                  type="button"
                  onClick={handleAddInstallment}
                  className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Installment
                </button>
              </div>

              <div className="space-y-2">
                {installments.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inst.name}
                      onChange={(e) => handleInstallmentChange(idx, "name", e.target.value)}
                      placeholder="Installment Name"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <input
                      type="number"
                      value={inst.amount}
                      onChange={(e) => handleInstallmentChange(idx, "amount", e.target.value)}
                      placeholder="Amount (₹)"
                      className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => handleInstallmentChange(idx, "due_date", e.target.value)}
                      className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                    {installments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstallment(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                "Create Fee Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
