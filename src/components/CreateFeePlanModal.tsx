"use client";

import { useState, useEffect } from "react";
import { BadgeDollarSign, AlertCircle, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import Modal from "./Modal";

interface StudentOption {
  id: string;
  name: string;
  student_code: string;
  course_id?: string | null;
}

interface CourseOption {
  id: string;
  name: string;
  base_fee?: number;
}

interface CreateFeePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedStudentId?: string;
}

export default function CreateFeePlanModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedStudentId,
}: CreateFeePlanModalProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Form State
  const [studentId, setStudentId] = useState(preselectedStudentId || "");
  const [courseId, setCourseId] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [discountAmount, setDiscountAmount] = useState<number | "">(0);
  const [paymentType, setPaymentType] = useState("FULL"); // FULL | INSTALLMENT
  const [installments, setInstallments] = useState<
    { installment_number: number; amount: number; due_date: string }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      fetch("/api/students")
        .then((r) => r.json())
        .then((d) => {
          if (d.students) setStudents(d.students);
        })
        .catch(() => {});

      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) setCourses(d.courses);
        })
        .catch(() => {});

      if (preselectedStudentId) {
        setStudentId(preselectedStudentId);
      }
    }
  }, [isOpen, preselectedStudentId]);

  // When student changes, auto select course
  useEffect(() => {
    if (studentId) {
      const st = students.find((s) => s.id === studentId);
      if (st && st.course_id) {
        setCourseId(st.course_id);
      }
    }
  }, [studentId, students]);

  // When course changes, auto fill total fee
  useEffect(() => {
    if (courseId) {
      const crs = courses.find((c) => c.id === courseId);
      if (crs && crs.base_fee) {
        setTotalAmount(crs.base_fee);
      }
    }
  }, [courseId, courses]);

  // Auto calculate installments when totalAmount, discountAmount or paymentType changes
  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const discount = Number(discountAmount) || 0;
    const net = Math.max(0, total - discount);

    if (paymentType === "FULL") {
      setInstallments([
        {
          installment_number: 1,
          amount: net,
          due_date: new Date().toISOString().slice(0, 10),
        },
      ]);
    } else if (installments.length === 0) {
      const half = Math.floor(net / 2);
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      setInstallments([
        {
          installment_number: 1,
          amount: half,
          due_date: today.toISOString().slice(0, 10),
        },
        {
          installment_number: 2,
          amount: net - half,
          due_date: nextMonth.toISOString().slice(0, 10),
        },
      ]);
    }
  }, [totalAmount, discountAmount, paymentType]);

  if (!isOpen) return null;

  const handleAddInstallment = () => {
    const num = installments.length + 1;
    const today = new Date();
    today.setMonth(today.getMonth() + num - 1);
    setInstallments([
      ...installments,
      { installment_number: num, amount: 0, due_date: today.toISOString().slice(0, 10) },
    ]);
  };

  const handleRemoveInstallment = (idx: number) => {
    const updated = installments
      .filter((_, i) => i !== idx)
      .map((item, i) => ({ ...item, installment_number: i + 1 }));
    setInstallments(updated);
  };

  const handleInstallmentChange = (
    idx: number,
    field: "amount" | "due_date",
    val: any
  ) => {
    const updated = [...installments];
    updated[idx] = { ...updated[idx], [field]: val };
    setInstallments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!studentId) throw new Error("Please select a student.");
      if (!courseId) throw new Error("Please select a course.");
      if (!totalAmount || Number(totalAmount) <= 0) throw new Error("Total course fee must be greater than 0.");

      const total = Number(totalAmount);
      const discount = Number(discountAmount) || 0;
      const net = Math.max(0, total - discount);

      const sumInst = installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      if (Math.abs(sumInst - net) > 1) {
        throw new Error(
          `Sum of installments (${formatCurrency(sumInst)}) must equal the net fee (${formatCurrency(net)}).`
        );
      }

      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_id: courseId,
          total_amount: total,
          discount_amount: discount,
          payment_type: paymentType,
          installments: installments.map((i) => ({
            installment_number: i.installment_number,
            amount: Number(i.amount),
            due_date: i.due_date,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create fee account.");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while creating fee plan.");
    } finally {
      setLoading(false);
    }
  };

  const netFee = Math.max(0, (Number(totalAmount) || 0) - (Number(discountAmount) || 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Student Fee Plan"
      subtitle="Assign course fees, discounts, and payment installment schedules"
      icon={<BadgeDollarSign className="w-5 h-5 text-emerald-600" />}
      maxWidth="2xl"
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
              "Create Fee Plan"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="">Select student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_code})
                </option>
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Total Fee (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 50000"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Discount (₹)
            </label>
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value ? Number(e.target.value) : 0)}
              placeholder="e.g. 5000"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Net Payable Fee
            </label>
            <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-extrabold text-xs sm:text-sm font-mono">
              {formatCurrency(netFee)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Payment Mode Structure
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <label
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                paymentType === "FULL"
                  ? "bg-brand-50 border-brand-300 text-brand-900 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="paymentType"
                value="FULL"
                checked={paymentType === "FULL"}
                onChange={(e) => setPaymentType(e.target.value)}
                className="hidden"
              />
              <span className="text-xs">Full Payment</span>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                paymentType === "INSTALLMENT"
                  ? "bg-brand-50 border-brand-300 text-brand-900 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="paymentType"
                value="INSTALLMENT"
                checked={paymentType === "INSTALLMENT"}
                onChange={(e) => setPaymentType(e.target.value)}
                className="hidden"
              />
              <span className="text-xs">Installments</span>
            </label>
          </div>
        </div>

        {/* Installment Schedule List */}
        {paymentType === "INSTALLMENT" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Installment Schedule</span>
              <button
                type="button"
                onClick={handleAddInstallment}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Installment
              </button>
            </div>

            <div className="space-y-2">
              {installments.map((inst, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-slate-500 shrink-0 w-16">
                    Inst #{inst.installment_number}
                  </span>
                  <input
                    type="number"
                    value={inst.amount}
                    onChange={(e) =>
                      handleInstallmentChange(idx, "amount", Number(e.target.value))
                    }
                    placeholder="Amount (₹)"
                    className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="date"
                    value={inst.due_date}
                    onChange={(e) =>
                      handleInstallmentChange(idx, "due_date", e.target.value)
                    }
                    className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  {installments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstallment(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
