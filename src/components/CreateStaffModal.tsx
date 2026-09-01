"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Copy,
  Share2,
  Lock,
  Eye,
  EyeOff,
  Wand2,
  Check,
} from "lucide-react";
import { formatErrorMessage } from "@/lib/errors";

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStaff?: any;
}

export default function CreateStaffModal({
  isOpen,
  onClose,
  onSuccess,
  editingStaff = null,
}: CreateStaffModalProps) {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Academics");
  const [designation, setDesignation] = useState("Instructor");
  const [role, setRole] = useState("MENTOR");
  const [status, setStatus] = useState("Active");
  const [assignedCourseId, setAssignedCourseId] = useState("");
  const [assignedBatchId, setAssignedBatchId] = useState("");

  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Granular Permissions
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    students: true,
    attendance: true,
    tasks: true,
    activities: true,
    notes: true,
    announcements: true,
  });

  const [createLogin, setCreateLogin] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const [credentialsModal, setCredentialsModal] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setCredentialsModal(null);
      fetchOptions();

      if (editingStaff) {
        setName(editingStaff.name);
        setEmployeeId(editingStaff.employee_id || "");
        setPhone(editingStaff.phone || "");
        setEmail(editingStaff.email || "");
        setDepartment(editingStaff.department || "Academics");
        setDesignation(editingStaff.designation || "Instructor");
        setRole(editingStaff.role || "MENTOR");
        setStatus(editingStaff.status || "Active");
        setAssignedCourseId(editingStaff.assigned_course_id || "");
        setAssignedBatchId(editingStaff.assigned_batch_id || "");

        if (editingStaff.permissions) {
          const permList = editingStaff.permissions.split(",");
          setPermissions({
            students: permList.includes("students"),
            attendance: permList.includes("attendance"),
            tasks: permList.includes("tasks"),
            activities: permList.includes("activities"),
            notes: permList.includes("notes"),
            announcements: permList.includes("announcements"),
          });
        }
        setCreateLogin(false);
      } else {
        setName("");
        setEmployeeId(`STF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        setPhone("");
        setEmail("");
        setDepartment("Academics");
        setDesignation("Instructor");
        setRole("MENTOR");
        setStatus("Active");
        setAssignedCourseId("");
        setAssignedBatchId("");
        setPermissions({
          students: true,
          attendance: true,
          tasks: true,
          activities: true,
          notes: true,
          announcements: true,
        });
        setCreateLogin(true);
        setCustomPassword("");
      }
    }
  }, [isOpen, editingStaff]);

  const fetchOptions = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        fetch("/api/courses").then((r) => r.json()),
        fetch("/api/batches").then((r) => r.json()),
      ]);
      if (coursesRes.courses) setCourses(coursesRes.courses);
      if (batchesRes.batches) setBatches(batchesRes.batches);
    } catch (e) {
      console.error("Failed to load courses/batches for staff modal", e);
    }
  };

  if (!isOpen) return null;

  const generateAutoPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(pass + "1A!");
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
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingStaff ? "Edit Staff / Mentor" : "Create Staff & Mentor Account"}
            </h3>
            <p className="text-xs text-slate-500">Configure login credentials, assigned batches, and granular permissions</p>
          </div>
        </div>

        {credentialsModal ? (
          <div className="space-y-5 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Staff Portal Account Created Successfully!</span>
            </div>
            <p className="text-xs text-slate-600">
              Share these login credentials directly with <strong className="text-slate-900">{credentialsModal.name}</strong>.
            </p>

            <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400">Staff Name:</span>
                <span className="font-bold text-slate-900">{credentialsModal.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400">Staff ID / Login ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-600">{credentialsModal.employee_id}</span>
                  <button
                    onClick={() => handleCopy(credentialsModal.employee_id, "id")}
                    className="p-1 text-slate-400 hover:text-brand-600 rounded"
                    title="Copy Staff ID"
                  >
                    {copiedKey === "id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{credentialsModal.password}</span>
                  <button
                    onClick={() => handleCopy(credentialsModal.password, "password")}
                    className="p-1 text-slate-400 hover:text-brand-600 rounded"
                    title="Copy Password"
                  >
                    {copiedKey === "password" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Portal URL:</span>
                <span className="text-[11px] text-slate-600 truncate max-w-[200px]">{credentialsModal.portal_url}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleCopy(formattedShareText, "details")}
                className="py-2.5 px-4 rounded-xl bg-white border border-emerald-300 text-slate-700 hover:bg-emerald-100/50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {copiedKey === "details" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                <span>{copiedKey === "details" ? "Copied Details!" : "Copy Login Details"}</span>
              </button>

              <button
                onClick={() => handleShare("Staff Credentials", formattedShareText)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Login Details</span>
              </button>
            </div>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-colors"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <>
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
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Prof. David Miller"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Staff ID / Login ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="STF-2026-0001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0192"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
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
                    placeholder="david@institute.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="MENTOR">MENTOR (Academic & Student Scoped)</option>
                    <option value="TEACHER">TEACHER (Class & Attendance Focus)</option>
                    <option value="STAFF">STAFF (General Administration)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Course
                  </label>
                  <select
                    value={assignedCourseId}
                    onChange={(e) => setAssignedCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="">-- Optional Course Assignment --</option>
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="">-- Optional Batch Assignment --</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 10: GRANULAR PERMISSIONS */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Staff Portal Permissions
                  </span>
                  <span className="text-[11px] text-slate-500">Enforced on Client & Server</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { key: "students", label: "Students" },
                    { key: "attendance", label: "Attendance" },
                    { key: "tasks", label: "Tasks" },
                    { key: "activities", label: "Activities" },
                    { key: "notes", label: "Notes" },
                    { key: "announcements", label: "Announcements" },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[p.key] ?? false}
                        onChange={(e) =>
                          setPermissions((prev) => ({ ...prev, [p.key]: e.target.checked }))
                        }
                        className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!editingStaff && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-blue-900 text-xs">Create Staff Portal Account</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={createLogin}
                      onChange={(e) => setCreateLogin(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                    />
                  </div>

                  {createLogin && (
                    <div className="space-y-2 pt-2 border-t border-blue-100">
                      <label className="block text-[11px] font-semibold text-blue-900 uppercase">
                        Password Option
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPasswordInput ? "text" : "password"}
                            value={customPassword}
                            onChange={(e) => setCustomPassword(e.target.value)}
                            placeholder="Set Password or click Generate"
                            className="w-full pl-3.5 pr-9 py-2 bg-white border border-blue-200 rounded-lg text-slate-900 text-xs font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordInput(!showPasswordInput)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={generateAutoPassword}
                          className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Generate</span>
                        </button>
                      </div>
                    </div>
                  )}
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editingStaff ? (
                    "Save Staff Member"
                  ) : (
                    "Create Staff Account"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
