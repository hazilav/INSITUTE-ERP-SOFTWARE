"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  ShieldAlert,
  Copy,
  Check,
  Share2,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { formatErrorMessage } from "@/lib/errors";
import Modal from "./Modal";

interface CourseOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
  course_id: string;
}

interface StaffMember {
  id: string;
  name: string;
  employee_id: string;
  phone: string;
  email?: string | null;
  department?: string | null;
  designation?: string | null;
  role: string;
  status: string;
  assigned_course_id?: string | null;
  assigned_batch_id?: string | null;
  permissions?: string[] | string | null;
}

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStaff?: StaffMember | null;
}

const DEFAULT_PERMISSIONS = [
  { key: "manage_students", label: "Manage Students", desc: "Add, edit, and view student records" },
  { key: "manage_attendance", label: "Mark Attendance", desc: "Take daily class attendance" },
  { key: "manage_classes", label: "Manage Classes / Timetable", desc: "Schedule and manage live classes" },
  { key: "manage_marks", label: "Manage Marks & Exam Scores", desc: "Create marksheets and grade students" },
  { key: "manage_activities", label: "Manage Tasks & Assignments", desc: "Assign and grade student assignments" },
  { key: "view_reports", label: "View Reports & Performance", desc: "Access class performance analytics" },
];

export default function CreateStaffModal({
  isOpen,
  onClose,
  onSuccess,
  editingStaff,
}: CreateStaffModalProps) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchOption[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Academics");
  const [designation, setDesignation] = useState("Senior Instructor");
  const [role, setRole] = useState("TEACHER");
  const [status, setStatus] = useState("ACTIVE");
  const [assignedCourseId, setAssignedCourseId] = useState("");
  const [assignedBatchId, setAssignedBatchId] = useState("");

  // Portal Account State
  const [createLogin, setCreateLogin] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Granular Permissions State
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    manage_students: true,
    manage_attendance: true,
    manage_classes: true,
    manage_marks: true,
    manage_activities: true,
    view_reports: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentialsModal, setCredentialsModal] = useState<{
    name: string;
    employee_id: string;
    password: string;
    portal_url: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setCredentialsModal(null);

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

      if (editingStaff) {
        setName(editingStaff.name);
        setEmployeeId(editingStaff.employee_id);
        setPhone(editingStaff.phone);
        setEmail(editingStaff.email || "");
        setDepartment(editingStaff.department || "Academics");
        setDesignation(editingStaff.designation || "Instructor");
        setRole(editingStaff.role);
        setStatus(editingStaff.status);
        setAssignedCourseId(editingStaff.assigned_course_id || "");
        setAssignedBatchId(editingStaff.assigned_batch_id || "");

        const rawPerms = editingStaff.permissions;
        const permList = Array.isArray(rawPerms) ? rawPerms : typeof rawPerms === "string" ? JSON.parse(rawPerms || "[]") : [];
        const permMap: Record<string, boolean> = {};
        DEFAULT_PERMISSIONS.forEach((p) => {
          permMap[p.key] = Array.isArray(permList) ? permList.includes(p.key) : false;
        });
        setPermissions(permMap);
      } else {
        setName("");
        setEmployeeId("");
        setPhone("");
        setEmail("");
        setDepartment("Academics");
        setDesignation("Instructor");
        setRole("TEACHER");
        setStatus("ACTIVE");
        setAssignedCourseId("");
        setAssignedBatchId("");
        setCustomPassword("");

        const permMap: Record<string, boolean> = {};
        DEFAULT_PERMISSIONS.forEach((p) => {
          permMap[p.key] = p.key !== "view_reports";
        });
        setPermissions(permMap);
      }
    }
  }, [isOpen, editingStaff]);

  useEffect(() => {
    if (assignedCourseId) {
      const matching = batches.filter((b) => b.course_id === assignedCourseId);
      setFilteredBatches(matching);
      if (!matching.some((b) => b.id === assignedBatchId)) {
        setAssignedBatchId(matching[0]?.id || "");
      }
    } else {
      setFilteredBatches(batches);
    }
  }, [assignedCourseId, batches]);

  if (!isOpen) return null;

  const handlePermissionToggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleShare = async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch (err) {
        handleCopy(text, "details");
      }
    } else {
      handleCopy(text, "details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role.toUpperCase() === "OWNER") {
        throw new Error("The Institute OWNER role is protected and cannot be assigned to staff.");
      }

      const activePermissions = Object.keys(permissions).filter((k) => permissions[k]);

      const endpoint = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff";
      const method = editingStaff ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          employee_id: employeeId,
          phone,
          email,
          department,
          designation,
          role,
          status,
          assigned_course_id: assignedCourseId || null,
          assigned_batch_id: assignedBatchId || null,
          permissions: activePermissions,
          create_login: editingStaff ? false : createLogin,
          custom_password: customPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save staff record");

      if (data.credentials) {
        setCredentialsModal(data.credentials);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, "Unable to save staff member. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const formattedShareText = credentialsModal
    ? `Institute Staff Portal\n\nName: ${credentialsModal.name}\nStaff ID: ${credentialsModal.employee_id}\nPassword: ${credentialsModal.password}\n\nPortal Link: ${credentialsModal.portal_url}`
    : "";

  if (credentialsModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onSuccess();
          onClose();
        }}
        title="Staff Portal Credentials Created"
        subtitle={`Login account generated for ${credentialsModal.name}`}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Done & Return to Staff List
          </button>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Share these login credentials directly with <strong className="text-slate-900">{credentialsModal.name}</strong>.
          </p>

          <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-slate-900 font-mono space-y-2 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-400 font-sans">Staff ID / Login ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-600">{credentialsModal.employee_id}</span>
                <button
                  onClick={() => handleCopy(credentialsModal.employee_id, "id")}
                  className="p-1 text-slate-400 hover:text-brand-600 rounded"
                >
                  {copiedKey === "id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-400 font-sans">Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{credentialsModal.password}</span>
                <button
                  onClick={() => handleCopy(credentialsModal.password, "password")}
                  className="p-1 text-slate-400 hover:text-brand-600 rounded"
                >
                  {copiedKey === "password" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Portal URL:</span>
              <span className="text-[11px] text-slate-600 truncate max-w-[180px]">{credentialsModal.portal_url}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => handleCopy(formattedShareText, "details")}
              className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedKey === "details" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
              <span>{copiedKey === "details" ? "Copied Details" : "Copy Login Details"}</span>
            </button>

            <button
              onClick={() => handleShare("Staff Credentials", formattedShareText)}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Credentials</span>
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
      title={editingStaff ? "Edit Staff / Mentor" : "Create Staff & Mentor Account"}
      subtitle="Configure staff profile, course assignments, and permissions"
      icon={<UserCheck className="w-5 h-5" />}
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
            ) : editingStaff ? (
              "Update Staff Member"
            ) : (
              "Create Staff & Save"
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
        {/* Personal Details */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            1. Basic Profile Information
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
                placeholder="e.g. Anish Varma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Staff / Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-101"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@institute.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Role & Designation */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            2. Role & Organizational Designation
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold"
              >
                <option value="MENTOR">Mentor</option>
                <option value="TEACHER">Teacher / Faculty</option>
                <option value="STAFF">Administrative Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Lecturer"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Course
              </label>
              <select
                value={assignedCourseId}
                onChange={(e) => setAssignedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">All Courses / Unassigned</option>
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
                value={assignedBatchId}
                onChange={(e) => setAssignedBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">All Batches / Unassigned</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            3. Feature Permissions
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_PERMISSIONS.map((perm) => (
              <label
                key={perm.key}
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                  permissions[perm.key]
                    ? "bg-brand-50/60 border-brand-200 text-brand-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!permissions[perm.key]}
                  onChange={() => handlePermissionToggle(perm.key)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <p className="font-bold text-xs leading-none">{perm.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{perm.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Login Account Setup */}
        {!editingStaff && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm">Generate Staff Login Credentials</span>
              </div>
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-700 cursor-pointer"
              />
            </div>

            {createLogin && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Initial Custom Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave blank for auto secure password"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
