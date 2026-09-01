"use client";

import { useState } from "react";
import { KeyRound, Copy, Share2, ShieldCheck, Mail, Lock, X, Check } from "lucide-react";
import { getStaffPortalUrl, sharePortalLink } from "@/lib/urls";
import Toast from "@/components/Toast";
import { formatErrorMessage } from "@/lib/errors";

interface StaffAccountCardClientProps {
  staffId: string;
  staffName: string;
  userAccount: {
    id: string;
    email: string;
    role: string;
    status: string;
    must_change_password?: boolean;
    updated_at?: Date | string | null;
    last_login?: Date | null;
  };
  canManage: boolean;
}

export default function StaffAccountCardClient({
  staffId,
  staffName,
  userAccount,
  canManage,
}: StaffAccountCardClientProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tempCredentials, setTempCredentials] = useState<any | null>(null);
  const [copiedType, setCopiedType] = useState<"pass" | "details" | null>(null);

  const staffPortalUrl = getStaffPortalUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(staffPortalUrl);
    setToastMessage("Staff portal link copied!");
  };

  const handleShareLinkDirect = () => {
    const text = `Staff Portal Login\n\nName: ${staffName}\nEmail: ${userAccount.email}\n\nStaff Portal:\n${staffPortalUrl}`;
    sharePortalLink("Staff Portal Login", text, staffPortalUrl, () => {
      setToastMessage("Staff portal details copied!");
    });
  };

  const handleResetPassword = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTempCredentials(data.credentials);
        setToastMessage("Staff temporary password generated!");
      } else {
        setToastMessage(formatErrorMessage(data.error, "Failed to reset password."));
      }
    } catch (err: any) {
      setToastMessage(formatErrorMessage(err, "Network error."));
    }
  };

  const handleCopyPassword = () => {
    if (!tempCredentials) return;
    navigator.clipboard.writeText(tempCredentials.temp_password);
    setCopiedType("pass");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCredentials = (creds: any) => {
    const text = `Staff Portal Login\n\nName: ${creds.staff_name}\nEmail: ${creds.email}\nTemporary Password: ${creds.temp_password}\n\nStaff Portal:\n${creds.portal_url}\n\nPlease change your password after your first login.`;
    navigator.clipboard.writeText(text);
    setCopiedType("details");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShareCredentials = (creds: any) => {
    const text = `Staff Portal Login\n\nName: ${creds.staff_name}\nEmail: ${creds.email}\nTemporary Password: ${creds.temp_password}\n\nStaff Portal:\n${creds.portal_url}\n\nPlease change your password after your first login.`;
    sharePortalLink("Staff Portal Login", text, creds.portal_url, () => {
      setToastMessage("Login details copied to clipboard!");
    });
  };

  const passwordStatus = userAccount.must_change_password ? "Temp Set" : "Set";
  const lastUpdatedFormatted = userAccount.updated_at
    ? new Date(userAccount.updated_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" /> Staff Portal Account
        </h3>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
          userAccount.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          {userAccount.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Email</p>
          <p className="font-bold text-slate-900 truncate">{userAccount.email}</p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Status</p>
          <p className="font-bold text-emerald-600 capitalize">{userAccount.status}</p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Password</p>
          <p className="font-bold text-slate-900">{passwordStatus}</p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
          <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Last Updated</p>
          <p className="font-mono text-slate-700 font-medium">{lastUpdatedFormatted}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={handleCopyLink}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Copy className="w-3.5 h-3.5 text-brand-600" /> Copy Portal Link
        </button>

        <button
          onClick={handleShareLinkDirect}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share Login
        </button>

        {canManage && (
          <button
            onClick={handleResetPassword}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </button>
        )}
      </div>

      {/* Generated Temporary Credentials Modal */}
      {tempCredentials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" /> New Temporary Password Issued
              </h3>
              <button onClick={() => setTempCredentials(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-sans">Name:</span>
                  <span className="font-bold text-white">{tempCredentials.staff_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-sans">Email:</span>
                  <span className="font-bold text-slate-200">{tempCredentials.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Temporary Password:</span>
                  <span className="font-extrabold text-emerald-400 text-sm font-mono">
                    {tempCredentials.temp_password}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Copy this temporary password now. It will not be shown again after closing this dialog.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPassword}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    {copiedType === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
                    {copiedType === "pass" ? "Copied!" : "Copy Password"}
                  </button>

                  <button
                    onClick={() => handleCopyCredentials(tempCredentials)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    {copiedType === "details" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-brand-600" />}
                    {copiedType === "details" ? "Copied!" : "Copy Login Details"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleShareCredentials(tempCredentials)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Login
                  </button>

                  <button
                    onClick={() => setTempCredentials(null)}
                    className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
