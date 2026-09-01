"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Share2,
  Check,
  AlertCircle,
  Plus,
  KeyRound,
  Sparkles,
  Lock,
} from "lucide-react";
import { getStudentPortalUrl, sharePortalLink } from "@/lib/urls";

interface OptionItem {
  id: string;
  name: string;
  code?: string | null;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suggestedCode?: string;
  defaultMode?: string;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
  suggestedCode = "STU-2026-00001",
  defaultMode = "hybrid",
}: AddStudentModalProps) {
  // Personal Info State
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // Academic Info State
  const [learningMode, setLearningMode] = useState(defaultMode);
  const [status, setStatus] = useState("ACTIVE");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");

  // Section 25: Owner Controlled Portal Access State
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const [studentCodeInput, setStudentCodeInput] = useState(suggestedCode);
  const [customPassword, setCustomPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loaded Options
  const [courses, setCourses] = useState<OptionItem[]>([]);
  const [batches, setBatches] = useState<OptionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Account Created Success Modal State
  const [createdAccount, setCreatedAccount] = useState<{
    studentCode: string;
    loginEmail: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStudentCodeInput(suggestedCode);
      // Fetch active courses and batches for dropdowns
      fetch("/api/courses")
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) setCourses(d.courses);
        })
        .catch((e) => console.error(e));

      fetch("/api/batches")
        .then((r) => r.json())
        .then((d) => {
          if (d.batches) setBatches(d.batches);
        })
        .catch((e) => console.error(e));
    }
  }, [isOpen, suggestedCode]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `Std#${pass}`;
    setCustomPassword(gen);
    setConfirmPassword(gen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (createLoginAccount && customPassword && customPassword !== confirmPassword) {
      setError("Initial password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photo,
          phone,
          email,
          dob,
          gender,
          address,
          parent_name: parentName,
          parent_phone: parentPhone,
          learning_mode: learningMode,
          status,
          course_id: courseId || null,
          batch_id: batchId || null,
          custom_student_code: studentCodeInput,
          create_login_account: createLoginAccount,
          custom_password: customPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create student record");
      }

      if (data.accountDetails) {
        setCreatedAccount(data.accountDetails);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDetails = () => {
    if (!createdAccount) return;
    const portalUrl = getStudentPortalUrl();
    const text = `Student Portal Login\n\nName: ${name}\nStudent ID: ${createdAccount.studentCode}\nPassword: ${createdAccount.tempPassword}\n\nPortal:\n${portalUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLogin = () => {
    if (!createdAccount) return;
    const portalUrl = getStudentPortalUrl();
    const text = `Hello ${name},\n\nYour Student Portal account has been created.\n\nStudent ID: ${createdAccount.studentCode}\nPassword: ${createdAccount.tempPassword}\n\nStudent Portal:\n${portalUrl}\n\nPlease change your password after your first login.`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 sm:p-8 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdAccount ? (
          <div>
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add New Student</h3>
                <p className="text-xs text-slate-500">
                  Register a student and configure their Student Portal login access
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" /> Personal Information
                </h4>

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
                      placeholder="e.g. Ahmed"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
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
                      placeholder="ahmed@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Profile Photo URL
                    </label>
                    <input
                      type="url"
                      value={photo}
                      onChange={(e) => setPhoto(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Home Address
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="742 Evergreen Terrace, Sector 4..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Robert Vance"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Parent / Guardian Phone
                    </label>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="+1 (555) 019-9999"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information & Batch Assignment */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-500" /> Academic Assignment
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Course
                    </label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    >
                      <option value="">No Course Assigned</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.code ? `(${c.code})` : ""}
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    >
                      <option value="">No Batch Assigned</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Learning Mode
                    </label>
                    <select
                      value={learningMode}
                      onChange={(e) => setLearningMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white capitalize"
                    >
                      <option value="offline">🏫 Offline</option>
                      <option value="online">🌐 Online</option>
                      <option value="hybrid">🔄 Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 25: STUDENT PORTAL ACCESS SECTION */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Student Portal Access</h4>
                      <p className="text-[11px] text-slate-500">Automatically create login account for student</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createLoginAccount}
                      onChange={(e) => setCreateLoginAccount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {createLoginAccount && (
                  <div className="space-y-3 pt-2 border-t border-purple-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Student ID Code
                      </label>
                      <input
                        type="text"
                        value={studentCodeInput}
                        onChange={(e) => setStudentCodeInput(e.target.value)}
                        placeholder="e.g. STU-2026-00125"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-brand-600 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Initial Password
                          </label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> Auto Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="e.g. K7mP92xQ"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="text"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Create Student & Login</>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* SECTION 25: LOGIN DETAILS CREATED DIALOG */
          <div className="text-center py-4 space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900">Student Account Created Successfully</h3>
              <p className="text-sm text-slate-500 mt-1">
                Share these login credentials directly with {name}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-left text-white space-y-3 font-mono text-sm max-w-md mx-auto shadow-xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Student Name:</span>
                <span className="font-bold text-white">{name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Student ID:</span>
                <span className="font-extrabold text-brand-400">{createdAccount.studentCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Password:</span>
                <span className="font-extrabold text-emerald-400">{createdAccount.tempPassword}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-sans">Student Portal:</span>
                <span className="text-brand-300 text-xs truncate max-w-[200px]">{getStudentPortalUrl()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              🔒 The password is saved as a bcrypt hash and will not be displayed again after closing this dialog.
            </p>

            <div className="flex gap-2 pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
                {copied ? "Login details copied" : "Copy Login"}
              </button>

              <button
                type="button"
                onClick={handleShareLogin}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Login
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
