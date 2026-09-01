"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ChangePasswordClientProps {
  studentName: string;
}

export default function ChangePasswordClient({ studentName }: ChangePasswordClientProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/student/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl border border-slate-700/80">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Create New Password</h1>
          <p className="text-xs text-slate-400">
            Welcome <strong className="text-slate-200">{studentName}</strong>! Please update your temporary login password before continuing.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-900/50 text-rose-200 border border-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">New Permanent Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? "Updating Password..." : "Set Permanent Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
