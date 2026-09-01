"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Plus,
  AlertCircle,
  BookOpen,
  Layers,
  Key,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Copy,
  Share2,
  Check,
} from "lucide-react";
import { getStudentPortalUrl, sharePortalLink } from "@/lib/urls";
import { formatErrorMessage } from "@/lib/errors";
import Modal from "./Modal";

interface OptionItem {
  id: string;
  name: string;
  course_id?: string;
  fee?: number;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suggestedCode?: string;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
}: AddStudentModalProps) {
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<OptionItem[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [admissionStatus, setAdmissionStatus] = useState("ENROLLED");
  const [customStudentCode, setCustomStudentCode] = useState("");

  // Student Portal Login Credentials State
  const [createPortalAccount, setCreatePortalAccount] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState<{
    studentCode: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setCreatedAccount(null);

      fetch("/api/courses")
        .then((r) => r.json())
        .then((data) => {
          if (data.courses) setCourses(data.courses);
        })
        .catch(() => {});

      fetch("/api/batches")
        .then((r) => r.json())
        .then((data) => {
          if (data.batches) setBatches(data.batches);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (courseId) {
      const filtered = batches.filter((b) => b.course_id === courseId);
      setFilteredBatches(filtered);
      if (!filtered.some((b) => b.id === batchId)) {
        setBatchId(filtered[0]?.id || "");
      }
    } else {
      setFilteredBatches(batches);
    }
  }, [courseId, batches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          dob: dob || undefined,
          gender: gender || undefined,
          address: address || undefined,
          guardian_name: guardianName || undefined,
          guardian_phone: guardianPhone || undefined,
          course_id: courseId || undefined,
          batch_id: batchId || undefined,
          enrollment_date: enrollmentDate,
          admission_status: admissionStatus,
          custom_student_code: customStudentCode || undefined,
          create_portal_account: createPortalAccount,
          custom_password: customPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add student");
      }

      if (data.tempPassword) {
        setCreatedAccount({
          studentCode: data.student.student_code,
          tempPassword: data.tempPassword,
        });
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, "Unable to register student. Please check details and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDetails = () => {
    if (!createdAccount) return;
    const text = `Student Portal Credentials\nName: ${name}\nStudent ID: ${createdAccount.studentCode}\nPassword: ${createdAccount.tempPassword}\nPortal Link: ${getStudentPortalUrl()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLogin = () => {
    if (!createdAccount) return;
    const portalUrl = getStudentPortalUrl();
    const text = `Hi ${name},\nYour Student Portal account has been created for your institute.\n\nLogin Details:\nStudent ID: ${createdAccount.studentCode}\nPassword: ${createdAccount.tempPassword}\n\nLogin URL: ${portalUrl}`;
    sharePortalLink("Student Portal Login", text, portalUrl, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDone = () => {
    setCreatedAccount(null);
    onSuccess();
    onClose();
  };

  if (createdAccount) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleDone}
        title="Student Account Created"
        subtitle={`Login credentials generated for ${name}`}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={handleDone}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Done & Return to Students
          </button>
        }
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-left text-white space-y-3 font-mono text-xs max-w-md mx-auto shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Student Name:</span>
              <span className="font-bold text-white">{name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Student ID:</span>
              <span className="font-extrabold text-brand-400">{createdAccount.studentCode}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Password:</span>
              <span className="font-extrabold text-emerald-400">{createdAccount.tempPassword}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Portal URL:</span>
              <span className="text-brand-300 text-[11px] truncate max-w-[180px]">{getStudentPortalUrl()}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            🔒 Store or share these credentials safely. The student can use them to log into their Student Portal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyDetails}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
              {copied ? "Copied Details" : "Copy Credentials"}
            </button>

            <button
              type="button"
              onClick={handleShareLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Credentials
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Student"
      subtitle="Register a student and configure their Student Portal login access"
      icon={<Plus className="w-5 h-5" />}
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
              "Create Student & Save"
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
        {/* Personal Information */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-500" /> Personal Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Residential Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Street, City, Pincode"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Guardian Information */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-500" /> Guardian / Parent Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guardian Name
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Parent/Guardian Full Name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guardian Phone
              </label>
              <input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="Guardian Contact Number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Course & Enrollment */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-500" /> Enrollment & Course Assignment
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Course
              </label>
              <select
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Batch
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">
                  {courseId ? "Select batch..." : "Select course first"}
                </option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Enrollment Date
              </label>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Admission Status
              </label>
              <select
                value={admissionStatus}
                onChange={(e) => setAdmissionStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold"
              >
                <option value="ENROLLED">Enrolled (Active)</option>
                <option value="INQUIRY">Inquiry / Lead</option>
                <option value="COMPLETED">Graduated / Completed</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custom Student ID
              </label>
              <input
                type="text"
                value={customStudentCode}
                onChange={(e) => setCustomStudentCode(e.target.value)}
                placeholder="Leave blank for auto ID"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Student Portal Account Creation Toggle */}
        <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-brand-900 text-xs sm:text-sm">
                Enable Student Portal Login
              </span>
            </div>
            <input
              type="checkbox"
              checked={createPortalAccount}
              onChange={(e) => setCreatePortalAccount(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
            />
          </div>

          {createPortalAccount && (
            <div className="pt-2 border-t border-brand-200/60 space-y-2">
              <label className="block text-[11px] font-semibold text-brand-800 uppercase tracking-wider">
                Initial Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave blank to generate random password"
                  className="w-full px-3.5 py-2 bg-white border border-brand-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-brand-700">
                A temporary password will be shown upon account creation so you can copy and share it with the student.
              </p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
