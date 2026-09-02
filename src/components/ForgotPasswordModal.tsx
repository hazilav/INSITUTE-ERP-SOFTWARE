"use client";

import { useState } from "react";
import { KeyRound, CheckCircle2, Mail, ArrowRight } from "lucide-react";
import Modal from "./Modal";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError("");

    // Simulate secure reset link request
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={submitted ? "Check your inbox" : "Reset your password"}
      subtitle={submitted ? "Password reset link dispatched" : "Enter your account email address"}
      icon={submitted ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <KeyRound className="w-5 h-5 text-brand-600" />}
      maxWidth="md"
      footer={
        submitted ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        ) : (
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send Link <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {!submitted ? (
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-500">
            Enter your account email address and we will send you instructions to reset your password.
          </p>

          {error && (
            <div className="p-3 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institute.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm transition-all"
                />
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            If an account exists for <span className="font-semibold text-slate-900">{email}</span>, password reset instructions have been sent.
          </p>
        </div>
      )}
    </Modal>
  );
}
