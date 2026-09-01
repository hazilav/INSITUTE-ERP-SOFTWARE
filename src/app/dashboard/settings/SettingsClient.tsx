"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import {
  Building2,
  Users,
  ShieldCheck,
  GraduationCap,
  CalendarCheck,
  BadgeDollarSign,
  Bell,
  AlertTriangle,
  Save,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Download,
  UserCheck,
  UserX,
  Sliders,
  Globe,
  Mail,
  Phone,
  MapPin,
  X,
  Copy,
  Share2,
  Link2,
  Upload,
  Trash2,
} from "lucide-react";
import { getStudentPortalUrl, getStaffPortalUrl, sharePortalLink } from "@/lib/urls";
import { formatErrorMessage } from "@/lib/errors";

interface SettingsClientProps {
  institute: any;
  users: any[];
  initialPermissions: any[];
  currentUser: { id: string; name: string; email: string; role: string };
}

const MODULE_KEYS = [
  { key: "students", label: "Student Data Center" },
  { key: "courses", label: "Courses & Programs" },
  { key: "classes", label: "Classes & Timetable" },
  { key: "attendance", label: "Student Attendance" },
  { key: "activities", label: "Activities & Homework" },
  { key: "marks", label: "Marks & Results" },
  { key: "fees", label: "Fees & Payments" },
  { key: "staff", label: "Staff & Mentors" },
  { key: "tasks", label: "Staff Tasks" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "documents", label: "Documents & Certificates" },
  { key: "settings", label: "Institute Settings" },
];

export default function SettingsClient({
  institute: initialInst,
  users: initialUsers,
  initialPermissions,
  currentUser,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("institute");
  const [institute, setInstitute] = useState(initialInst);
  const [usersList, setUsersList] = useState(initialUsers);
  const [permissions, setPermissions] = useState(initialPermissions);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for Institute
  const [instName, setInstName] = useState(institute.name || "");
  const [instLogo, setInstLogo] = useState(institute.logo || "");
  const [instPhone, setInstPhone] = useState(institute.phone || "");
  const [instEmail, setInstEmail] = useState(institute.email || "");
  const [instWebsite, setInstWebsite] = useState(institute.website || "");
  const [instAddress, setInstAddress] = useState(institute.address || "");
  const [instCity, setInstCity] = useState(institute.city || "");
  const [instState, setInstState] = useState(institute.state || "");
  const [instCountry, setInstCountry] = useState(institute.country || "");
  const [instMode, setInstMode] = useState(institute.institute_mode || "hybrid");

  // Form states for Student Portal
  const [portalEnabled, setPortalEnabled] = useState(institute.portal_enabled ?? true);
  const [studentLoginEnabled, setStudentLoginEnabled] = useState(institute.student_login_enabled ?? true);
  const [requireFirstPwdChange, setRequireFirstPwdChange] = useState(institute.require_first_login_pwd_change ?? false);
  const [idPrefix, setIdPrefix] = useState(institute.student_id_prefix || "INS");
  const [idStart, setIdStart] = useState(institute.student_id_start || 1);

  // Form states for Academic
  const [passingPct, setPassingPct] = useState(institute.passing_percentage ?? 40);
  const [gradeSystem, setGradeSystem] = useState(institute.grade_system || "A+,A,B+,B,C,D,F");
  const [academicYear, setAcademicYear] = useState(institute.academic_year || "2026-2027");
  const [defaultDuration, setDefaultDuration] = useState(institute.default_class_duration ?? 60);

  // Form states for Attendance
  const [minAttendancePct, setMinAttendancePct] = useState(institute.min_attendance_pct ?? 75);
  const [allowLate, setAllowLate] = useState(institute.allow_late_status ?? true);
  const [allowLeave, setAllowLeave] = useState(institute.allow_leave_status ?? true);

  // Form states for Fees
  const [currency, setCurrency] = useState(institute.default_currency || "INR");
  const [paymentMethods, setPaymentMethods] = useState(institute.payment_methods || "Cash,UPI,Bank Transfer,Card,Online,Other");
  const [feeReminderDays, setFeeReminderDays] = useState(institute.fee_reminder_days ?? 3);

  // Form states for Notifications
  const [notifyAcademic, setNotifyAcademic] = useState(institute.notify_academic ?? true);
  const [notifyAttendance, setNotifyAttendance] = useState(institute.notify_attendance ?? true);
  const [notifyFees, setNotifyFees] = useState(institute.notify_fees ?? true);
  const [notifyTasks, setNotifyTasks] = useState(institute.notify_tasks ?? true);
  const [notifySystem, setNotifySystem] = useState(institute.notify_system ?? true);

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState("STAFF");
  const [newUserPassword, setNewUserPassword] = useState("");

  // Logo & Account Deletion States
  const [logoUploading, setLogoUploading] = useState(false);
  const [deleteStep1Open, setDeleteStep1Open] = useState(false);
  const [deleteStep2Open, setDeleteStep2Open] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isOwner = currentUser.role === "OWNER";

  const categories = [
    { id: "institute", label: "Institute Info", icon: Building2 },
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "account", label: "Account Settings", icon: UserCheck },
    { id: "student-portal", label: "Student Portal", icon: GraduationCap },
    { id: "academic", label: "Academic", icon: Sliders },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "fees", label: "Fees & Payment", icon: BadgeDollarSign },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "danger", label: "Danger Zone", icon: AlertTriangle },
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setMessage({ type: "error", text: "Invalid file format. Allowed: PNG, JPG, JPEG, WebP." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size exceeds maximum 5MB limit." });
      return;
    }

    setLogoUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setInstLogo(data.url);
        setMessage({ type: "success", text: "Logo uploaded preview ready. Click Save Changes to apply." });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to upload logo." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to upload logo." });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = () => {
    setInstLogo("");
    setMessage({ type: "success", text: "Logo removed. Click Save Changes to apply." });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()) {
      return;
    }

    setDeletingAccount(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteConfirmEmail }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDeleteStep2Open(false);
        window.location.href = data.redirectUrl || "/login?deleted=true";
      } else {
        setMessage({ type: "error", text: data.error || "Unable to delete your account right now. Please try again." });
        setDeleteStep2Open(false);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unable to delete your account right now. Please try again." });
      setDeleteStep2Open(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSaveInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/institute", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: instName,
          logo: instLogo,
          phone: instPhone,
          email: instEmail,
          website: instWebsite,
          address: instAddress,
          city: instCity,
          state: instState,
          country: instCountry,
          institute_mode: instMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstitute(data.institute);
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudentPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/student-portal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal_enabled: portalEnabled,
          student_login_enabled: studentLoginEnabled,
          require_first_login_pwd_change: requireFirstPwdChange,
          student_id_prefix: idPrefix,
          student_id_start: idStart,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/academic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passing_percentage: passingPct,
          grade_system: gradeSystem,
          academic_year: academicYear,
          default_class_duration: defaultDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_attendance_pct: minAttendancePct,
          allow_late_status: allowLate,
          allow_leave_status: allowLeave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_currency: currency,
          payment_methods: paymentMethods,
          fee_reminder_days: feeReminderDays,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_academic: notifyAcademic,
          notify_attendance: notifyAttendance,
          notify_fees: notifyFees,
          notify_tasks: notifyTasks,
          notify_system: notifySystem,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          role: newUserRole,
          password: newUserPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsersList((prev) => [...prev, data.user]);
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPhone("");
        setNewUserPassword("");
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionToggle = (role: string, moduleKey: string, allowed: boolean) => {
    setPermissions((prev) => {
      const existing = prev.find((p) => p.role === role && p.module_key === moduleKey);
      if (existing) {
        return prev.map((p) =>
          p.role === role && p.module_key === moduleKey ? { ...p, is_allowed: allowed } : p
        );
      } else {
        return [...prev, { role, module_key: moduleKey, is_allowed: allowed }];
      }
    });
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Role permissions saved successfully." });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateInstitute = async () => {
    if (!confirm("CAUTION: Are you sure you want to deactivate your institute? All logins will be disabled until reactivated.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/institute", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deactivated: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Institute has been deactivated. Preserving database records." });
        setTimeout(() => { window.location.href = "/login"; }, 1500);
      } else {
        setMessage({ type: "error", text: formatErrorMessage(data.error, "Error deactivating institute.") });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: formatErrorMessage(err, "Error deactivating institute.") });
    } finally {
      setSaving(false);
    }
  };

  const isModuleAllowed = (role: string, moduleKey: string) => {
    const p = permissions.find((perm) => perm.role === role && perm.module_key === moduleKey);
    return p ? p.is_allowed : true; // Default allowed
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Institute Settings & Control Center
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          System Configuration, Permissions Matrix, and User Access Management — {institute.name}
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Settings Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Category Sidebar */}
        <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xs space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`w-full p-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Form */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* TAB 1: INSTITUTE INFO */}
          {activeTab === "institute" && (
            <form onSubmit={handleSaveInstitute} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-600" /> Institute Information
                </h3>
                <span className="text-[11px] font-bold text-slate-400">ID: {institute.id}</span>
              </div>

              {/* Institute Logo Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <label className="block font-bold text-slate-800 text-xs">Institute Logo</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                    {instLogo ? (
                      <img src={instLogo} alt="Institute Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-left w-full">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {logoUploading ? "Uploading..." : "Upload Logo"}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={logoUploading || saving || !isOwner}
                        />
                      </label>

                      {instLogo && (
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          disabled={saving || logoUploading || !isOwner}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, JPEG or WebP (Max 5MB). Preview displayed on headers, dashboards & portal views.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Institute Name *</label>
                  <input
                    type="text"
                    required
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operating Learning Mode *</label>
                  <select
                    value={instMode}
                    onChange={(e) => setInstMode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="hybrid">🔄 Hybrid (Offline + Live Online)</option>
                    <option value="offline">🏫 Offline Only</option>
                    <option value="online">🌐 Online Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={instPhone}
                    onChange={(e) => setInstPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={instWebsite}
                    onChange={(e) => setInstWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={instLogo}
                    onChange={(e) => setInstLogo(e.target.value)}
                    placeholder="/logo.png or image URL"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={instAddress}
                  onChange={(e) => setInstAddress(e.target.value)}
                  placeholder="Street address..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={instCity}
                    onChange={(e) => setInstCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={instState}
                    onChange={(e) => setInstState(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={instCountry}
                    onChange={(e) => setInstCountry(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" /> User Accounts & Staff Roles
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Manage administrative and staff access levels</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Staff / Mentor Account
                </button>
              </div>

              {/* Users Roster Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-4 font-mono">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              u.role === "OWNER"
                                ? "bg-amber-100 text-amber-900"
                                : u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-900"
                                : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== "OWNER" && u.id !== currentUser.id && (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                u.status === "Active"
                                  ? "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {u.status === "Active" ? "Deactivate" : "Reactivate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Module Permissions Matrix */}
              {isOwner && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Module Permission Matrix</h4>
                      <p className="text-slate-500 text-[11px]">Control section access per role for Admin, Staff, and Mentors</p>
                    </div>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-xs"
                    >
                      Save Permissions Matrix
                    </button>
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-4">Module / Section</th>
                          <th className="py-2.5 px-4 text-center">ADMIN</th>
                          <th className="py-2.5 px-4 text-center">STAFF</th>
                          <th className="py-2.5 px-4 text-center">MENTOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {MODULE_KEYS.map((m) => (
                          <tr key={m.key} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{m.label}</td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isModuleAllowed("ADMIN", m.key)}
                                onChange={(e) => handlePermissionToggle("ADMIN", m.key, e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isModuleAllowed("STAFF", m.key)}
                                onChange={(e) => handlePermissionToggle("STAFF", m.key, e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isModuleAllowed("MENTOR", m.key)}
                                onChange={(e) => handlePermissionToggle("MENTOR", m.key, e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: STUDENT PORTAL */}
          {activeTab === "student-portal" && (
            <form onSubmit={handleSaveStudentPortal} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-brand-600" /> Student Portal & ID Settings
                </h3>
              </div>

              {/* Portal Access Links & Sharing Section */}
              <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200/60 space-y-3">
                <h4 className="font-bold text-brand-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Link2 className="w-4 h-4 text-brand-600" /> Portal Access & Quick Sharing
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-brand-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Student Portal</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                        {portalEnabled && studentLoginEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-brand-600 truncate">{getStudentPortalUrl(institute.website)}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getStudentPortalUrl(institute.website));
                          setMessage({ type: "success", text: "Student portal link copied!" });
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3 h-3 text-brand-600" /> Copy Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = getStudentPortalUrl(institute.website);
                          const text = `Student Portal\nLogin here: ${url}\nUse your Student ID and password to login.`;
                          sharePortalLink("Student Portal", text, url, () => {
                            setMessage({ type: "success", text: "Student portal link copied!" });
                          });
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Staff Portal</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">Enabled</span>
                    </div>
                    <p className="font-mono text-[11px] text-brand-600 truncate">{getStaffPortalUrl(institute.website)}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getStaffPortalUrl(institute.website));
                          setMessage({ type: "success", text: "Staff portal link copied!" });
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3 h-3 text-brand-600" /> Copy Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = getStaffPortalUrl(institute.website);
                          const text = `Staff Portal\nLogin here: ${url}\nUse your staff email and password to login.`;
                          sharePortalLink("Staff Portal", text, url, () => {
                            setMessage({ type: "success", text: "Staff portal link copied!" });
                          });
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Enable Student Portal</span>
                    <span className="text-slate-500 text-[11px]">Allow students to access their portal dashboard</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalEnabled}
                    onChange={(e) => setPortalEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Enable Student Login</span>
                    <span className="text-slate-500 text-[11px]">Allow students to log in using Student ID & password</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={studentLoginEnabled}
                    onChange={(e) => setStudentLoginEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Require Password Change on First Login</span>
                    <span className="text-slate-500 text-[11px]">Prompt student to update default password</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireFirstPwdChange}
                    onChange={(e) => setRequireFirstPwdChange(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Student ID Generation Format</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ID Prefix</label>
                    <input
                      type="text"
                      value={idPrefix}
                      onChange={(e) => setIdPrefix(e.target.value)}
                      placeholder="e.g. INS or ABC"
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Starting Number</label>
                    <input
                      type="number"
                      value={idStart}
                      onChange={(e) => setIdStart(parseInt(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  💡 Format preview: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded">{idPrefix}-2026-00001</code>. Existing student IDs will remain untouched.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ACADEMIC */}
          {activeTab === "academic" && (
            <form onSubmit={handleSaveAcademic} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-600" /> Academic System Configuration
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passing Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={passingPct}
                    onChange={(e) => setPassingPct(parseFloat(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grading Scale System</label>
                  <select
                    value={gradeSystem}
                    onChange={(e) => setGradeSystem(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="A+,A,B+,B,C,D,F">Letter Grade (A+, A, B+, B, C, D, F)</option>
                    <option value="PERCENTAGE">Percentage (%) Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Class Duration (Minutes)</label>
                  <input
                    type="number"
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grading System Scale</label>
                  <input
                    type="text"
                    value={gradeSystem}
                    onChange={(e) => setGradeSystem(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: ATTENDANCE */}
          {activeTab === "attendance" && (
            <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-brand-600" /> Attendance Policy & Thresholds
                </h3>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Minimum Attendance Threshold (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={minAttendancePct}
                  onChange={(e) => setMinAttendancePct(parseFloat(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold"
                />
                <p className="text-slate-400 text-[11px] mt-1">Used for low attendance alerts (default 75%)</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Allow 'Late' Attendance Status</span>
                  <input
                    type="checkbox"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Allow 'Leave' Attendance Status</span>
                  <input
                    type="checkbox"
                    checked={allowLeave}
                    onChange={(e) => setAllowLeave(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: FEES */}
          {activeTab === "fees" && (
            <form onSubmit={handleSaveFees} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-brand-600" /> Fee & Financial Settings
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Currency Symbol / Code *</label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Reminder Days Before Due</label>
                  <input
                    type="number"
                    value={feeReminderDays}
                    onChange={(e) => setFeeReminderDays(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Allowed Payment Methods (Comma Separated)</label>
                <input
                  type="text"
                  value={paymentMethods}
                  onChange={(e) => setPaymentMethods(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <form onSubmit={handleSaveNotifications} className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-600" /> System Notification Categories
                </h3>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Academic Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifyAcademic}
                    onChange={(e) => setNotifyAcademic(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Attendance Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifyAttendance}
                    onChange={(e) => setNotifyAttendance(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Fee Payment Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifyFees}
                    onChange={(e) => setNotifyFees(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Task Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifyTasks}
                    onChange={(e) => setNotifyTasks(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">System Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifySystem}
                    onChange={(e) => setNotifySystem(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB: ACCOUNT SETTINGS */}
          {activeTab === "account" && (
            <div className="space-y-6 text-xs">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-600" /> Account Settings
                </h3>
              </div>

              {/* Account Information */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Account Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Full Name</span>
                    <p className="font-bold text-slate-900 text-sm">{currentUser.name}</p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Email Address</span>
                    <p className="font-bold text-slate-900 text-sm">{currentUser.email}</p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Assigned Role</span>
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-brand-100 text-brand-700 border border-brand-200">
                      {currentUser.role}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Institute Workspace</span>
                    <p className="font-bold text-slate-900 text-sm">{institute.name}</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-4">
                <div>
                  <h4 className="font-extrabold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Danger Zone
                  </h4>
                  <p className="text-slate-600 text-xs mt-1">
                    Deleting your account is permanent and cannot be undone.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep1Open(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="space-y-6 text-xs">
              <div className="pb-3 border-b border-rose-100">
                <h3 className="font-bold text-rose-700 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" /> Danger Zone (Owner Only)
                </h3>
              </div>

              {isOwner ? (
                <div className="space-y-4">
                  {/* Export Backup */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">Export Complete Institute Data</span>
                      <span className="text-slate-500 text-[11px]">Download full JSON database backup of all students, courses, fees, and records</span>
                    </div>
                    <a
                      href="/api/settings/export"
                      download
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-4 h-4" /> Download Backup JSON
                    </a>
                  </div>

                  {/* Deactivate Institute */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-rose-900 block text-sm">Deactivate Institute</span>
                      <span className="text-rose-600 text-[11px]">Prevent all user logins while preserving all database records and history safely</span>
                    </div>
                    <button
                      onClick={handleDeactivateInstitute}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs shrink-0"
                    >
                      Deactivate Institute
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-rose-600 font-bold bg-rose-50 rounded-2xl border border-rose-200">
                  🔒 Only the Institute Owner can access the Danger Zone options.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        title="Create Staff / Mentor Account"
        subtitle="Create staff member login credentials"
        icon={<Users className="w-5 h-5 text-brand-600" />}
        maxWidth="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowCreateUserModal(false)}
              className="w-full sm:w-auto flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={saving}
              className="w-full sm:w-auto flex-[2] py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Role *</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold"
            >
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MENTOR">MENTOR</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Secondary Owner creation is blocked.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Step 1 Confirmation Modal */}
      <Modal
        isOpen={deleteStep1Open}
        onClose={() => setDeleteStep1Open(false)}
        title="Delete Account?"
        subtitle="Permanent Action"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        maxWidth="md"
      >
        <div className="p-2 space-y-4 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            This action is permanent. Your account will be deleted and you may lose access to this institute.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteStep1Open(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteStep1Open(false);
                setDeleteStep2Open(true);
                setDeleteConfirmEmail("");
              }}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Step 2 Confirmation Modal */}
      <Modal
        isOpen={deleteStep2Open}
        onClose={() => setDeleteStep2Open(false)}
        title="Are you absolutely sure?"
        subtitle="Email Confirmation Required"
        icon={<Trash2 className="w-5 h-5 text-rose-600" />}
        maxWidth="md"
      >
        <div className="p-2 space-y-4 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deleting your account cannot be undone. Enter your email to confirm:
          </p>
          <p className="text-xs font-mono font-bold text-slate-800 bg-slate-100 py-1.5 px-3 rounded-xl inline-block select-all border border-slate-200">
            {currentUser.email}
          </p>

          <div className="space-y-2 text-left pt-2">
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Enter your email to confirm"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteStep2Open(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={
                deletingAccount ||
                deleteConfirmEmail.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()
              }
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingAccount ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
