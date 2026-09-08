"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ShieldCheck,
  Building2,
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Award,
  CreditCard,
  CheckSquare,
  Lock,
  Edit,
  Archive,
  KeyRound,
  Clock,
  History,
  CheckCircle2,
  Layers,
  GraduationCap,
  Link2,
  Video,
  UserCheck,
  UserX,
  CalendarDays,
  AlertTriangle,
  FileCheck,
  FileBarChart,
  BadgeDollarSign,
  Printer,
  Copy,
  Share2,
  Send,
  RefreshCw,
  X,
  ShieldAlert,
  Plus,
  Download,
  Undo2,
  FileText,
  Receipt,
} from "lucide-react";
import EditStudentModal from "@/components/EditStudentModal";
import ArchiveStudentModal from "@/components/ArchiveStudentModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import PaymentReceiptModal from "@/components/PaymentReceiptModal";
import FreezeStudentModal from "@/components/FreezeStudentModal";
import CreateInvoiceModal from "@/components/CreateInvoiceModal";
import RecordPaymentModal from "@/components/RecordPaymentModal";
import InvoiceViewModal from "@/components/InvoiceViewModal";
import CancelInvoiceModal from "@/components/CancelInvoiceModal";
import VoidPaymentModal from "@/components/VoidPaymentModal";
import Toast from "@/components/Toast";
import { calculateGrade } from "@/lib/grading";
import { exportToCSV } from "@/lib/export";
import { getStudentPortalUrl } from "@/lib/urls";
import { formatErrorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/currency";

interface ActivityEvent {
  id: string;
  action: string;
  performed_by: string;
  details?: string | null;
  created_at: string;
}

interface ClassItem {
  id: string;
  title: string;
  topic?: string | null;
  class_type: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  meeting_link?: string | null;
  content_url?: string | null;
  status: string;
}

interface AttendanceItem {
  id: string;
  date: string;
  status: string;
  class_type: string;
  remarks?: string | null;
  classItem?: { title: string; room?: string | null };
  course?: { name: string };
  batch?: { name: string };
}

interface StudentActivityItem {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  maximum_marks: number;
  course?: { name: string };
  submission?: {
    status: string;
    submitted_at: string;
    obtained_marks?: number | null;
  } | null;
}

interface StudentMarkItem {
  id: string;
  obtained_marks: number;
  percentage: number;
  grade: string;
  is_pass: boolean;
  result_status: string;
  feedback?: string | null;
  assessment: {
    id: string;
    name: string;
    type: string;
    assessment_date: string;
    maximum_marks: number;
    passing_marks: number;
    module_name?: string | null;
    course?: { name: string };
  };
}

interface StudentFeePlan {
  id: string;
  course_fee: number;
  discount_type: string;
  discount_value: number;
  final_fee: number;
  amount_paid: number;
  balance: number;
  payment_type: string;
  status: string;
  installments: Array<{
    id: string;
    name: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
    notes?: string | null;
    recorded_by?: { name: string } | null;
  }>;
}

interface StudentProfileClientProps {
  student: {
    id: string;
    student_code: string;
    name: string;
    photo?: string | null;
    phone: string;
    email?: string | null;
    dob?: string | null;
    gender?: string | null;
    address?: string | null;
    parent_name?: string | null;
    parent_phone?: string | null;
    learning_mode: string;
    status: string;
    freeze_reason?: string | null;
    frozen_at?: string | null;
    frozen_by?: string | null;
    created_at: string;
    updated_at?: string | null;
    course_id?: string | null;
    batch_id?: string | null;
    course?: { id: string; name: string; code?: string | null } | null;
    batch?: { id: string; name: string; code?: string | null } | null;
    user?: {
      id: string;
      email: string;
      status: string;
      must_change_password?: boolean;
      updated_at?: string;
      last_login?: string | null;
    } | null;
    activities?: ActivityEvent[];
  };
  instituteName: string;
  userRole: string;
  activeTab: string;
  upcomingClasses?: ClassItem[];
  attendanceRecords?: AttendanceItem[];
  studentActivitiesList?: StudentActivityItem[];
  studentMarksList?: StudentMarkItem[];
  studentFeePlan?: StudentFeePlan | null;
  studentInvoices?: any[];
  studentPayments?: any[];
  instituteDetails?: any;
}

export default function StudentProfileClient({
  student,
  instituteName,
  userRole,
  activeTab,
  upcomingClasses = [],
  attendanceRecords = [],
  studentActivitiesList = [],
  studentMarksList = [],
  studentFeePlan = null,
  studentInvoices = [],
  studentPayments = [],
  instituteDetails = null,
}: StudentProfileClientProps) {
  const router = useRouter();

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeAction, setFreezeAction] = useState<"freeze" | "unfreeze">("freeze");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tempCredentials, setTempCredentials] = useState<any | null>(null);

  // Financial Modals State
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<string | undefined>(undefined);
  const [invoiceViewModalOpen, setInvoiceViewModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [cancelInvoiceModalOpen, setCancelInvoiceModalOpen] = useState(false);
  const [selectedInvoiceToCancel, setSelectedInvoiceToCancel] = useState<any | null>(null);
  const [voidPaymentModalOpen, setVoidPaymentModalOpen] = useState(false);
  const [selectedPaymentToVoid, setSelectedPaymentToVoid] = useState<any | null>(null);

  const handleCopyID = () => {
    navigator.clipboard.writeText(student.student_code);
    setToastMessage("Student ID copied!");
  };

  const handleTogglePortalStatus = async () => {
    try {
      const res = await fetch(`/api/students/${student.id}/toggle-portal`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Portal account ${data.status === "ACTIVE" ? "reactivated" : "deactivated"}.`);
        router.refresh();
      } else {
        setToastMessage(formatErrorMessage(data.error, "Failed to update portal status."));
      }
    } catch (err: any) {
      setToastMessage(formatErrorMessage(err, "Network error."));
    }
  };

  const handleShareLoginDirect = () => {
    if (!tempCredentials) {
      setToastMessage("Reset the password first to generate new login details.");
      return;
    }
    const text = `Hello ${student.name},\n\nYour Student Portal account is ready.\n\nStudent ID: ${tempCredentials.student_id}\nTemporary Password: ${tempCredentials.temp_password}\n\nStudent Portal:\n${tempCredentials.portal_url}\n\nPlease change your password after your first login.`;
    if (navigator.share) {
      navigator.share({ title: "Student Portal Login", text, url: tempCredentials.portal_url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setToastMessage("Login details copied to clipboard!");
    }
  };

  const handleGeneratePassword = async () => {
    try {
      const res = await fetch(`/api/students/${student.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTempCredentials(data.credentials);
        setToastMessage("Temporary password generated!");
      } else {
        setToastMessage(formatErrorMessage(data.error, "Failed to generate password."));
      }
    } catch (err: any) {
      setToastMessage(formatErrorMessage(err, "Network error."));
    }
  };

  const handleCopyLoginDetails = (creds: any) => {
    const text = `Student Login\nStudent ID: ${creds.student_id}\nPassword: ${creds.temp_password}\nPortal Link: ${creds.portal_url}`;
    navigator.clipboard.writeText(text);
    setToastMessage("Login details copied!");
  };

  const handleShareWhatsApp = (creds: any) => {
    const text = `Hello ${student.name},\n\nYour student portal account has been created.\n\nStudent ID: ${creds.student_id}\nPassword: ${creds.temp_password}\n\nLogin: ${creds.portal_url}\n\nPlease change your password after your first login.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };


  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  // Real Attendance Metrics
  const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;

  const attendanceDenom = presentCount + lateCount + absentCount;
  const attendancePct =
    attendanceDenom > 0 ? (((presentCount + lateCount) / attendanceDenom) * 100).toFixed(2) : null;
  const isLowAttendance = attendancePct !== null && parseFloat(attendancePct) < 75.0;

  // Real Activity Metrics for Student
  const totalStudentActivities = studentActivitiesList.length;
  const completedStudentActivities = studentActivitiesList.filter(
    (a) => a.submission && (a.submission.status === "Reviewed" || a.submission.status === "Submitted")
  ).length;
  const now = new Date();
  const overdueStudentActivities = studentActivitiesList.filter(
    (a) => !a.submission && new Date(a.due_date) < now
  ).length;

  // Real Assessment Marks Metrics for Student
  const completedAssessmentsCount = studentMarksList.length;
  const totalMarksPctSum = studentMarksList.reduce((acc, m) => acc + m.percentage, 0);
  const avgMarksPct =
    completedAssessmentsCount > 0
      ? (totalMarksPctSum / completedAssessmentsCount).toFixed(2)
      : null;
  const overallGrade = avgMarksPct !== null ? calculateGrade(parseFloat(avgMarksPct)) : "—";

  // Real Fee Balance Metrics for Student
  const feeBalance = studentFeePlan ? formatCurrency(studentFeePlan.balance) : "—";
  const feeStatusLabel = studentFeePlan ? studentFeePlan.status : "No plan created";

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
      case "FROZEN":
        return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
      case "ON_HOLD":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DROPPED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "ARCHIVED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getModeBadgeStyle = (mode: string) => {
    switch (mode) {
      case "offline":
        return { label: "🏫 Offline", style: "bg-blue-100 text-blue-800 border-blue-200" };
      case "online":
        return { label: "🌐 Online", style: "bg-purple-100 text-purple-800 border-purple-200" };
      case "hybrid":
        return { label: "🔄 Hybrid", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "🔄 Hybrid", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
  };

  const modeBadge = getModeBadgeStyle(student.learning_mode);
  const initials = student.name
    ? student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  const tabs = [
    { id: "overview", label: "Overview", functional: true },
    { id: "attendance", label: "Attendance", functional: true },
    { id: "academic", label: "Classes", functional: true },
    { id: "activities", label: "Activities", functional: true },
    { id: "marks", label: "Results", functional: true },
    { id: "fees", label: "Fees", functional: true },
    { id: "tasks", label: "Tasks", functional: false },
    { id: "documents", label: "Documents", functional: true },
    { id: "portal", label: "Portal", functional: true },
  ];

  // 5 Profile Summary Cards
  const summaryCards = [
    {
      title: "Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "—",
      label: attendancePct !== null ? `${presentCount} P, ${absentCount} A` : "No session records",
      icon: CalendarCheck,
      color: isLowAttendance ? "text-rose-600 bg-rose-50" : "text-purple-600 bg-purple-50",
    },
    {
      title: "Course Progress",
      value: student.learning_mode ? student.learning_mode.toUpperCase() : "ACTIVE",
      label: student.course?.name ? `Course: ${student.course.name}` : "Active Student Enrollment",
      icon: BookOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Activities",
      value: `${completedStudentActivities} / ${totalStudentActivities}`,
      label: `${overdueStudentActivities} Overdue`,
      icon: ClipboardList,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Average Marks",
      value: avgMarksPct !== null ? `${avgMarksPct}% (${overallGrade})` : "—",
      label: `${completedAssessmentsCount} Assessments`,
      icon: Award,
      color: "text-amber-600 bg-amber-50",
    },
    {
      title: "Fee Balance",
      value: feeBalance,
      label: feeStatusLabel,
      icon: CreditCard,
      color: studentFeePlan && studentFeePlan.balance > 0 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Data Center
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {student.photo ? (
            <img
              src={student.photo}
              alt={student.name}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {initials}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {student.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getStatusBadgeStyle(student.status)}`}>
                {student.status === "FROZEN" ? "🟠 Frozen" : student.status === "ACTIVE" ? "🟢 Active" : student.status}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${modeBadge.style}`}>
                {modeBadge.label}
              </span>
              {isLowAttendance && (
                <span className="px-3 py-1 text-xs font-extrabold rounded-lg bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  🔴 Low Attendance
                </span>
              )}
            </div>

            <p className="text-sm font-mono font-bold text-brand-600 flex items-center gap-2">
              <span>ID: {student.student_code}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-normal text-slate-500">{instituteName}</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.phone}
              </span>
              {student.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 7 Quick Action Controls */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" /> Edit
            </button>

            {student.status === "FROZEN" ? (
              <button
                type="button"
                onClick={() => {
                  setFreezeAction("unfreeze");
                  setFreezeModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Unfreeze Student
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFreezeAction("freeze");
                  setFreezeModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Freeze Student
              </button>
            )}

            <Link
              href={`/dashboard/attendance?student_id=${student.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold text-xs transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-purple-600" /> Mark Attendance
            </Link>

            <Link
              href={`/dashboard/fees?student_id=${student.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Add Fee
            </Link>

            <Link
              href={`/dashboard/reports/staff-tasks?student_id=${student.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" /> Create Task
            </Link>

            <button
              onClick={handleShareLoginDirect}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Login
            </button>
          </div>
        )}
      </div>

      {/* Frozen Student Details Banner (Requirement 8) */}
      {student.status === "FROZEN" && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-amber-950">Student Account is Temporarily Frozen</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900 uppercase">
                  Inactive
                </span>
              </div>
              <p className="text-xs text-amber-800">
                This student cannot log in or access classes in the Student Portal. All historical data remains fully preserved.
              </p>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-900 font-medium">
                <div>
                  <span className="text-amber-700 block text-[11px] uppercase tracking-wider font-bold">Frozen On:</span>
                  <span className="font-bold">
                    {student.frozen_at
                      ? new Date(student.frozen_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700 block text-[11px] uppercase tracking-wider font-bold">Reason:</span>
                  <span className="font-bold">{student.freeze_reason || "None specified"}</span>
                </div>
                <div>
                  <span className="text-amber-700 block text-[11px] uppercase tracking-wider font-bold">Frozen By:</span>
                  <span className="font-bold">{student.frozen_by || "Administrator"}</span>
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setFreezeAction("unfreeze");
                setFreezeModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Unfreeze Student
            </button>
          )}
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{card.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{card.label}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/dashboard/students/${student.id}?tab=${tab.id}`}
                className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {!tab.functional && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-400">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <User className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Personal Information</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Full Name</span>
                  <span className="font-bold text-slate-900">{student.name}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Student ID</span>
                  <span className="font-mono font-bold text-brand-600">{student.student_code}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Phone Number</span>
                  <span className="font-mono text-slate-800">{student.phone}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Email Address</span>
                  <span>{student.email || "Not specified"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-slate-900 text-base">Academic Information</h3>
                </div>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Course</span>
                    {student.course ? (
                      <span className="font-bold text-slate-900">{student.course.name}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Batch</span>
                    {student.batch ? (
                      <span className="font-bold text-slate-900">{student.batch.name}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Portal Account Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-900 text-base">Portal Account</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                    student.user?.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {student.user ? student.user.status : "Inactive"}
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Student ID</span>
                    <span className="font-mono font-bold text-brand-600">{student.student_code}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Portal Status</span>
                    <span className={`font-bold ${student.user?.status === "ACTIVE" ? "text-emerald-600" : "text-slate-500"}`}>
                      {student.user ? (student.user.status === "ACTIVE" ? "Active" : "Inactive") : "Not Provisioned"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Password Status</span>
                    <span className="font-bold text-slate-800">
                      {student.user
                        ? student.user.must_change_password
                          ? "Temp Set"
                          : "Set"
                        : "Not Set"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Last Password Updated</span>
                    <span className="font-mono text-xs text-slate-600">
                      {student.user?.updated_at
                        ? new Date(student.user.updated_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCopyID}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 text-slate-700"
                    >
                      <Copy className="w-3.5 h-3.5 text-brand-600" /> Copy ID
                    </button>

                    <button
                      onClick={() => setResetPasswordOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Reset Password
                    </button>

                    <button
                      onClick={handleShareLoginDirect}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share Login
                    </button>

                    {student.user && (
                      <button
                        onClick={handleTogglePortalStatus}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                          student.user.status === "ACTIVE"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        }`}
                      >
                        {student.user.status === "ACTIVE" ? (
                          <>
                            <UserX className="w-3.5 h-3.5 text-slate-500" /> Deactivate Portal
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Reactivate Portal
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal Tab Content (Section 8) */}
      {activeTab === "portal" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 max-w-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Student Portal</h3>
                <p className="text-xs text-slate-500">Managed Student Portal Login Account</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-extrabold rounded-lg border ${
              student.user?.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              ● {student.user ? (student.user.status === "ACTIVE" ? "Active" : "Inactive") : "Not Set"}
            </span>
          </div>

          <div className="space-y-3 text-sm font-medium">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 uppercase font-bold">Student ID</span>
              <span className="font-mono font-bold text-brand-600 text-sm">{student.student_code}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 uppercase font-bold">Password Status</span>
              <span className="font-bold text-slate-900">
                ● {student.user ? (student.user.must_change_password ? "Temp Set" : "Set") : "Not Set"}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 uppercase font-bold">Last Updated</span>
              <span className="font-mono text-xs text-slate-600">
                {student.user?.updated_at
                  ? new Date(student.user.updated_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "01 Sep 2026"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={handleCopyID}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 text-slate-700"
            >
              <Copy className="w-3.5 h-3.5 text-brand-600" /> Copy ID
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(getStudentPortalUrl());
                setToastMessage("Portal link copied!");
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 text-slate-700"
            >
              <Link2 className="w-3.5 h-3.5 text-brand-600" /> Copy Portal Link
            </button>

            <button
              onClick={() => setResetPasswordOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" /> Reset Password
            </button>

            <button
              onClick={handleShareLoginDirect}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Login
            </button>
          </div>
        </div>
      )}

      {/* Fees & Invoices Tab Content */}
      {activeTab === "fees" && (() => {
        // Compute financial metrics from invoices (or fallback to feePlan)
        let totalCourseFee = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;

        if (studentInvoices && studentInvoices.length > 0) {
          studentInvoices.forEach((inv) => {
            if (!inv.is_cancelled) {
              totalCourseFee += inv.final_amount;
              totalPaid += inv.paid_amount;
              totalOutstanding += inv.outstanding_amount;
            }
          });
        } else if (studentFeePlan) {
          totalCourseFee = studentFeePlan.final_fee;
          totalPaid = studentFeePlan.amount_paid;
          totalOutstanding = studentFeePlan.balance;
        }

        const canManage = userRole === "OWNER" || userRole === "ADMIN";

        return (
          <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                  Fees, Invoices & Payments
                </h3>
                <p className="text-xs text-slate-500">
                  Manage student tuition invoices, collection records, and official receipts
                </p>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => setCreateInvoiceModalOpen(true)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Invoice
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInvoiceToPay(undefined);
                      setRecordPaymentModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" /> Record Payment
                  </button>
                </div>
              )}
            </div>

            {/* Section 1: Fee Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Course Fee
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {formatCurrency(totalCourseFee)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Total invoiced tuition amount
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Total Paid
                </span>
                <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {formatCurrency(totalPaid)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Total received & verified
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                  Total Outstanding
                </span>
                <p className="text-2xl font-black text-brand-700 mt-1 font-mono">
                  {formatCurrency(totalOutstanding)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Remaining balance due
                </span>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-5 h-5 text-brand-600" />
                  <h4 className="font-bold text-slate-900 text-base">Invoices ({studentInvoices.length})</h4>
                </div>
                {canManage && (
                  <button
                    onClick={() => setCreateInvoiceModalOpen(true)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Invoice
                  </button>
                )}
              </div>

              {studentInvoices.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[650px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Outstanding</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-brand-700">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {new Date(inv.invoice_date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {new Date(inv.due_date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(inv.final_amount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(inv.paid_amount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-brand-700">
                            {formatCurrency(inv.outstanding_amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                inv.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : inv.status === "Overdue"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : inv.status === "Partially Paid"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : inv.status === "Cancelled"
                                  ? "bg-slate-100 text-slate-600 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              ● {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForView({
                                    ...inv,
                                    student: {
                                      student_code: student.student_code,
                                      name: student.name,
                                      phone: student.phone,
                                      email: student.email,
                                      address: student.address,
                                    },
                                    course: inv.course || student.course,
                                    institute: instituteDetails || { name: instituteName },
                                  });
                                  setInvoiceViewModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                              >
                                View / PDF
                              </button>
                              {canManage && !inv.is_cancelled && inv.outstanding_amount > 0.001 && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceToPay(inv.id);
                                    setRecordPaymentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] cursor-pointer"
                                >
                                  Pay
                                </button>
                              )}
                              {canManage && !inv.is_cancelled && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceToCancel({
                                      id: inv.id,
                                      invoice_number: inv.invoice_number,
                                      student_name: student.name,
                                      final_amount: inv.final_amount,
                                      paid_amount: inv.paid_amount,
                                    });
                                    setCancelInvoiceModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-600 font-medium text-[11px] cursor-pointer"
                                  title="Cancel Invoice"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No invoices created for this student yet. Click{" "}
                  <strong>[ + Create Invoice ]</strong> above to issue a fee invoice.
                </div>
              )}
            </div>

            {/* Section 14: Payment History Log & Receipts */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-base">
                    Payment History & Receipts ({studentPayments.length})
                  </h4>
                </div>
                {canManage && (
                  <button
                    onClick={() => {
                      setSelectedInvoiceToPay(undefined);
                      setRecordPaymentModalOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
              </div>

              {studentPayments.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[650px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Receipt #</th>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Ref / Txn #</th>
                        <th className="px-4 py-3">Recorded By</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {new Date(p.payment_date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-brand-700">
                            {p.receipt_number}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {p.invoice?.invoice_number ? `#${p.invoice.invoice_number}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {p.is_voided ? (
                              <span className="line-through text-slate-400">
                                {formatCurrency(p.amount)}
                              </span>
                            ) : (
                              formatCurrency(p.amount)
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-800">{p.payment_method}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {p.reference_number || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {p.recorded_by?.name || "Staff"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.is_voided ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Voided
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedReceipt({
                                    id: p.id,
                                    receipt_number: p.receipt_number,
                                    amount: p.amount,
                                    payment_date: p.payment_date,
                                    payment_method: p.payment_method,
                                    reference_number: p.reference_number,
                                    notes: p.notes,
                                    student: {
                                      student_code: student.student_code,
                                      name: student.name,
                                      phone: student.phone,
                                      email: student.email,
                                    },
                                    course_name: student.course?.name || "General Course",
                                    invoice_number: p.invoice?.invoice_number || null,
                                    invoice_total: p.invoice?.final_amount,
                                    previously_paid: p.invoice?.paid_amount ? p.invoice.paid_amount - p.amount : 0,
                                    this_payment: p.amount,
                                    remaining_balance: p.invoice?.outstanding_amount !== undefined ? p.invoice.outstanding_amount : totalOutstanding,
                                    status: p.invoice?.status,
                                    recorded_by_name: p.recorded_by?.name || "Staff",
                                    institute_name: instituteName,
                                    institute_logo: instituteDetails?.logo,
                                    institute_address: [instituteDetails?.address, instituteDetails?.city].filter(Boolean).join(", "),
                                    institute_phone: instituteDetails?.phone,
                                    institute_email: instituteDetails?.email,
                                  });
                                  setReceiptModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                              >
                                View Receipt
                              </button>
                              {canManage && !p.is_voided && (
                                <button
                                  onClick={() => {
                                    setSelectedPaymentToVoid({
                                      id: p.id,
                                      receipt_number: p.receipt_number,
                                      amount: p.amount,
                                      student_name: student.name,
                                    });
                                    setVoidPaymentModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-600 font-medium text-[11px] cursor-pointer"
                                  title="Void Payment"
                                >
                                  Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No payment receipts recorded for this student yet.
                </div>
              )}
            </div>

            {/* Installment Schedule (Legacy FeePlan fallback) */}
            {studentFeePlan && studentFeePlan.installments && studentFeePlan.installments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <h4 className="font-bold text-slate-900 text-base">
                    Fee Plan Installment Schedule
                  </h4>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-3">Installment</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentFeePlan.installments.map((inst) => (
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
              </div>
            )}
          </div>
        );
      })()}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Student Documents Center</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Upload and manage official documents (ID proof, education certificates, application forms) for {student.name}.
            </p>
          </div>
          <Link
            href={`/dashboard/students/documents?student_id=${student.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
          >
            Manage Documents for {student.name} →
          </Link>
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === "certificates" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Student Certificates Center</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Generate, print, or view issued certificates (Course Completion, Participation, Internship) for {student.name}.
            </p>
          </div>
          <Link
            href={`/dashboard/students/certificates?student_id=${student.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all"
          >
            Generate / View Certificates →
          </Link>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={selectedReceipt}
      />

      {/* Generated Temporary Credentials Modal */}
      {tempCredentials && (
      <Modal
        isOpen={!!tempCredentials}
        onClose={() => setTempCredentials(null)}
        title="Student Credentials Generated"
        subtitle={`Login access generated for ${student.name}`}
        icon={<KeyRound className="w-5 h-5 text-amber-600" />}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => setTempCredentials(null)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        }
      >
        {tempCredentials && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 font-mono text-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Student ID:</span>
                <span className="font-extrabold text-amber-900">{tempCredentials.student_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Temporary Password:</span>
                <span className="font-extrabold text-brand-600 text-sm bg-white px-2 py-0.5 rounded border border-amber-300">
                  {tempCredentials.temp_password}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Portal Link:</span>
                <span className="text-[10px] text-slate-600 truncate max-w-[180px]">{tempCredentials.portal_url}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              ⚠️ Store or share these credentials safely. The student will be prompted to change their password on first login.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleCopyLoginDetails(tempCredentials)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Copy className="w-4 h-4" /> Copy Details
              </button>
              <button
                onClick={() => handleShareWhatsApp(tempCredentials)}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-4 h-4" /> Share WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>
      )}

      {/* Freeze / Unfreeze Student Modal */}
      {freezeModalOpen && (
        <FreezeStudentModal
          isOpen={freezeModalOpen}
          onClose={() => setFreezeModalOpen(false)}
          onSuccess={() => {
            const actionVerb = freezeAction === "freeze" ? "frozen" : "reactivated";
            setToastMessage(`Student account has been ${actionVerb}.`);
            router.refresh();
          }}
          student={student}
          action={freezeAction}
        />
      )}

      {/* Financial Modals */}
      {createInvoiceModalOpen && (
        <CreateInvoiceModal
          isOpen={createInvoiceModalOpen}
          onClose={() => setCreateInvoiceModalOpen(false)}
          onSuccess={(inv) => {
            setToastMessage("Invoice created successfully.");
            router.refresh();
          }}
          preselectedStudentId={student.id}
          preselectedCourseId={student.course?.id}
        />
      )}

      {recordPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={recordPaymentModalOpen}
          onClose={() => setRecordPaymentModalOpen(false)}
          onSuccess={(receipt) => {
            setToastMessage("Payment recorded successfully.");
            if (receipt) {
              setSelectedReceipt(receipt);
              setReceiptModalOpen(true);
            }
            router.refresh();
          }}
          preselectedStudentId={student.id}
          preselectedInvoiceId={selectedInvoiceToPay}
        />
      )}

      {invoiceViewModalOpen && (
        <InvoiceViewModal
          isOpen={invoiceViewModalOpen}
          onClose={() => setInvoiceViewModalOpen(false)}
          invoice={selectedInvoiceForView}
        />
      )}

      {cancelInvoiceModalOpen && (
        <CancelInvoiceModal
          isOpen={cancelInvoiceModalOpen}
          onClose={() => setCancelInvoiceModalOpen(false)}
          onSuccess={() => {
            setToastMessage("Invoice cancelled successfully.");
            router.refresh();
          }}
          invoice={selectedInvoiceToCancel}
        />
      )}

      {voidPaymentModalOpen && (
        <VoidPaymentModal
          isOpen={voidPaymentModalOpen}
          onClose={() => setVoidPaymentModalOpen(false)}
          onSuccess={() => {
            setToastMessage("Payment voided successfully.");
            router.refresh();
          }}
          payment={selectedPaymentToVoid}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
