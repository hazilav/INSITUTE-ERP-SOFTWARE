"use client";

import { useState } from "react";
import { KeyRound, Check, Copy, ShieldCheck, AlertCircle, Share2 } from "lucide-react";
import { getStudentPortalUrl, sharePortalLink } from "@/lib/urls";
import Modal from "./Modal";

interface ResetPasswordModalProps {
  studentId: string;
  studentName: string;
  studentCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordModal({
  studentId,
  studentName,
  studentCode,
  isOpen,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    loginEmail: string;
    tempPassword: string;
    credentials?: any;
  } | null>(null);
  const [copiedType, setCopiedType] = useState<"pass" | "details" | null>(null);

  const [mode, setMode] = useState<"generate" | "custom">("generate");
  const [customPassword, setCustomPassword] = useState("");

  if (!isOpen) return null;

  const handleReset = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/students/${studentId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_password: mode === "custom" && customPassword.trim() ? customPassword.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResult({
        loginEmail: data.loginEmail || data.credentials?.login_email || `${studentCode.toLowerCase()}@student.crm`,
        tempPassword: data.tempPassword || data.credentials?.temp_password,
        credentials: data.credentials,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const portalUrl = getStudentPortalUrl();

  const handleCopyPassword = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    setCopiedType("pass");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyDetails = () => {
    if (!result) return;
    const text = `Student Portal Login\n\nStudent Name: ${studentName}\nStudent ID: ${studentCode}\nPassword: ${result.tempPassword}\n\nPortal: ${portalUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedType("details");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShareLogin = () => {
    if (!result) return;
    const text = `Hello ${studentName},\n\nYour Student Portal account is ready.\n\nStudent ID: ${studentCode}\nTemporary Password: ${result.tempPassword}\n\nStudent Portal:\n${portalUrl}\n\nPlease change your password after your first login.`;
    sharePortalLink("Student Portal Login", text, portalUrl, () => {
      setCopiedType("details");
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  const handleDone = () => {
    setResult(null);
    onClose();
  };

  if (result) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleDone}
        title="Temporary Password Issued"
        subtitle={`Password updated for ${studentName}`}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={handleDone}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        }
      >
        <div className="text-center py-2 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-left text-white space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Student ID:</span>
              <span className="font-bold text-brand-400">{studentCode}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-sans">Login ID / Email:</span>
              <span className="text-slate-200 truncate max-w-[180px]">{result.loginEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">New Temp Password:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{result.tempPassword}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            🔒 This temporary password is displayed ONCE now and cannot be retrieved later.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyPassword}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              {copiedType === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
              {copiedType === "pass" ? "Copied!" : "Copy Password"}
            </button>

            <button
              type="button"
              onClick={handleShareLogin}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Login</span>
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
      title="Reset Student Password"
      subtitle={`Reset Student Portal password for ${studentName}`}
      icon={<KeyRound className="w-5 h-5 text-brand-600" />}
      maxWidth="md"
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
            onClick={handleReset}
            disabled={loading}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save New Password"
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

      <div className="space-y-3">
        <p className="text-xs text-slate-600">
          Are you sure you want to reset the portal password for <strong className="text-slate-900">{studentName}</strong> (
          <code className="text-brand-600 font-mono text-xs font-bold">{studentCode}</code>)?
        </p>

        <div className="space-y-3">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode("generate")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "generate" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ✨ Auto Generate
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "custom" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ✏️ Set Custom
            </button>
          </div>

          {mode === "custom" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter custom password (e.g. K7mP92xQ)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed font-medium">
          🔒 This will invalidate the previous password. The new password will be displayed ONCE after saving.
        </div>
      </div>
    </Modal>
  );
}
