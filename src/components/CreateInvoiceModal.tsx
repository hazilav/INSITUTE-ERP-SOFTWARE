"use client";

import { useState, useEffect } from "react";
import { Plus, Receipt, AlertCircle, Calendar, BookOpen, User, Percent, HelpCircle } from "lucide-react";
import Modal from "./Modal";
import { formatCurrency } from "@/lib/currency";
import { calculateInvoiceTotals } from "@/lib/finance";

interface StudentOption {
  id: string;
  student_code: string;
  name: string;
  course?: { id: string; name: string } | null;
}

interface CourseOption {
  id: string;
  name: string;
  code?: string | null;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice?: any) => void;
  preselectedStudentId?: string;
  preselectedCourseId?: string;
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedStudentId,
  preselectedCourseId,
}: CreateInvoiceModalProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || "");
  const [selectedCourseId, setSelectedCourseId] = useState(preselectedCourseId || "");
  const [description, setDescription] = useState("Course Tuition & Academic Fee");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [applyTax, setApplyTax] = useState(false);
  const [taxConfig, setTaxConfig] = useState<{ enabled: boolean; name: string; percentage: number }>({
    enabled: false,
    name: "GST",
    percentage: 0,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDueStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueStr);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      // Fetch active students and institute tax settings
      Promise.all([
        fetch("/api/students?status=ACTIVE&limit=200").then((r) => r.json()),
        fetch("/api/courses").then((r) => r.json()),
        fetch("/api/settings/institute").then((r) => r.json()),
      ])
        .then(([stuData, courseData, instData]) => {
          if (stuData.students) {
            setStudents(stuData.students);
            if (preselectedStudentId) {
              const matched = stuData.students.find((s: any) => s.id === preselectedStudentId);
              if (matched) {
                setSelectedStudentId(matched.id);
                if (matched.course?.id) {
                  setSelectedCourseId(matched.course.id);
                }
              }
            }
          }
          if (courseData.courses) {
            setCourses(courseData.courses);
          }
          if (instData.institute) {
            setTaxConfig({
              enabled: Boolean(instData.institute.tax_enabled),
              name: instData.institute.tax_name || "GST",
              percentage: instData.institute.tax_percentage || 0,
            });
            if (instData.institute.tax_enabled) {
              setApplyTax(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, preselectedStudentId, preselectedCourseId]);

  if (!isOpen) return null;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleStudentChange = (stuId: string) => {
    setSelectedStudentId(stuId);
    const stu = students.find((s) => s.id === stuId);
    if (stu?.course?.id) {
      setSelectedCourseId(stu.course.id);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const parsedDiscount = parseFloat(discount) || 0;

  const totals = calculateInvoiceTotals({
    amount: parsedAmount,
    discount: parsedDiscount,
    taxPercentage: taxConfig.percentage,
    taxEnabled: taxConfig.enabled && applyTax,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Please enter a valid invoice amount greater than ₹0.");
      return;
    }

    if (parsedDiscount > parsedAmount) {
      setError("Discount amount cannot exceed the invoice amount.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          course_id: selectedCourseId || undefined,
          description: description.trim() || "Course Tuition & Academic Fee",
          amount: parsedAmount,
          discount: parsedDiscount,
          apply_tax: taxConfig.enabled && applyTax,
          invoice_date: invoiceDate,
          due_date: dueDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to generate invoice. Please try again.");
      }

      onSuccess(data.invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || "Unable to generate invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Student Fee Invoice"
      subtitle="Generate a professional fee invoice for student tuition"
      icon={<Receipt className="w-5 h-5 text-brand-600" />}
      maxWidth="2xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-invoice-form"
            disabled={loading}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Invoice
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="create-invoice-form" onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Student & Course Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Student <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-medium"
            >
              <option value="">-- Choose Student --</option>
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name} ({stu.student_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Course / Program
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-medium"
            >
              <option value="">-- Select Course (Optional) --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedStudent && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-slate-800">{selectedStudent.name}</span>
            </div>
            <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              ID: {selectedStudent.student_code}
            </span>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Invoice Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="e.g. Annual Tuition Fee, Term 1 Fee"
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Invoice Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-mono"
            />
          </div>
        </div>

        {/* Financial Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Fee Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              required
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm font-mono font-bold"
            />
          </div>
        </div>

        {/* Tax (ONLY if configured/enabled) */}
        {taxConfig.enabled ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                Apply {taxConfig.name} ({taxConfig.percentage}%)
              </span>
              <p className="text-[11px] text-slate-500">
                Enabled in institute settings. Tax amount: {formatCurrency(totals.tax)}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Tax/GST is not enabled in Settings. Tax applied: ₹0.</span>
          </div>
        )}

        {/* Real-time Calculation Summary Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/40 border border-brand-200/80 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Course Fee:</span>
            <span className="font-mono font-bold">{formatCurrency(totals.amount)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-xs text-purple-700 font-medium">
              <span>Discount:</span>
              <span className="font-mono font-bold">- {formatCurrency(totals.discount)}</span>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between text-xs text-indigo-700 font-medium">
              <span>{taxConfig.name} ({taxConfig.percentage}%):</span>
              <span className="font-mono font-bold">+ {formatCurrency(totals.tax)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-brand-200 flex justify-between items-center">
            <span className="font-bold text-slate-900 text-sm">Final Invoice Total:</span>
            <span className="text-lg font-mono font-extrabold text-brand-700">
              {formatCurrency(totals.finalAmount)}
            </span>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Notes / Payment Instructions (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Please pay online via UPI or bank transfer by due date."
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
          />
        </div>
      </form>
    </Modal>
  );
}
