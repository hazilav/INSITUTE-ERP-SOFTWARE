"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";

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
  const [photo, setPhoto] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("Academics");
  const [designation, setDesignation] = useState("Instructor");
  const [role, setRole] = useState("MENTOR");
  const [status, setStatus] = useState("Active");

  const [createLogin, setCreateLogin] = useState(true);
  const [temporaryPasswordAlert, setTemporaryPasswordAlert] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setTemporaryPasswordAlert(null);

      if (editingStaff) {
        setName(editingStaff.name);
        setPhoto(editingStaff.photo || "");
        setPhone(editingStaff.phone);
        setEmail(editingStaff.email || "");
        setAddress(editingStaff.address || "");
        setDob(editingStaff.dob ? new Date(editingStaff.dob).toISOString().split("T")[0] : "");
        setJoiningDate(
          editingStaff.joining_date
            ? new Date(editingStaff.joining_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
        setDepartment(editingStaff.department || "Academics");
        setDesignation(editingStaff.designation || "Instructor");
        setRole(editingStaff.role || "MENTOR");
        setStatus(editingStaff.status || "Active");
        setCreateLogin(false);
      } else {
        setName("");
        setPhoto("");
        setPhone("");
        setEmail("");
        setAddress("");
        setDob("");
        setJoiningDate(new Date().toISOString().split("T")[0]);
        setDepartment("Academics");
        setDesignation("Instructor");
        setRole("MENTOR");
        setStatus("Active");
        setCreateLogin(true);
      }
    }
  }, [isOpen, editingStaff]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role.toUpperCase() === "OWNER") {
        throw new Error("The Institute OWNER role is protected and cannot be assigned to staff.");
      }

      const endpoint = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff";
      const method = editingStaff ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photo,
          phone,
          email,
          address,
          dob: dob || null,
          joining_date: joiningDate,
          department,
          designation,
          role,
          status,
          create_login: editingStaff ? false : createLogin,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save staff record");

      if (data.temporaryPassword) {
        setTemporaryPasswordAlert(data.temporaryPassword);
      } else {
        onSuccess();
        onClose();
      }
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
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingStaff ? "Edit Staff Member" : "Add New Staff / Mentor"}
            </h3>
            <p className="text-xs text-slate-500">Configure employment details, role permissions, and login accounts</p>
          </div>
        </div>

        {temporaryPasswordAlert ? (
          <div className="space-y-4 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Staff Account Created Successfully!</span>
            </div>
            <p className="text-xs text-slate-600">
              Please share these initial login credentials with <strong className="text-slate-900">{name}</strong>. The temporary password will not be shown again.
            </p>

            <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Login Email:</span>
                <span className="font-bold text-slate-900">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Temp Password:</span>
                <span className="font-extrabold text-brand-600 text-sm">{temporaryPasswordAlert}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
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
                    placeholder="e.g. Dr. Sarah Connor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
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
                    placeholder="e.g. +1 555-0192"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.connor@institute.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold"
                  >
                    <option value="MENTOR">MENTOR (Academic & Student Scoped)</option>
                    <option value="STAFF">STAFF (Operational Management)</option>
                    <option value="ADMIN">ADMIN (Administrative Permissions)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Academics, IT, Finance"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
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
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {!editingStaff && email && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-blue-900 text-xs block">Generate Portal Login Account</span>
                      <span className="text-[11px] text-blue-700">Creates user credentials with hashed temporary password</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={createLogin}
                    onChange={(e) => setCreateLogin(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                  />
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
                  ) : editingStaff ? (
                    "Save Staff Profile"
                  ) : (
                    "Add Staff Member"
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
