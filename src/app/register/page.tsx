"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, User, Mail, Lock, Phone, MapPin, Image as ImageIcon, ArrowRight, AlertCircle, ShieldCheck, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [step, setStep] = useState<1 | 2>(1);

  // Institute details
  const [instituteName, setInstituteName] = useState("");
  const [logo, setLogo] = useState("");
  const [institutePhone, setInstitutePhone] = useState("");
  const [instituteEmail, setInstituteEmail] = useState("");
  const [address, setAddress] = useState("");

  // Owner details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!instituteName.trim()) {
      setError("Please provide your Institute Name.");
      return;
    }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteName,
          logo,
          institutePhone,
          instituteEmail,
          address,
          name,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Successfully registered & automatically logged in as OWNER
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-96 bg-brand-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Building2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Create Institute Workspace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Setup your multi-tenant institute CRM and become the Institute Owner
        </p>

        {/* Step Indicator */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div
            onClick={() => setStep(1)}
            className={`cursor-pointer px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
              step === 1
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            Institute Info
          </div>
          <div className="w-6 h-[1px] bg-slate-700" />
          <div
            onClick={() => instituteName && setStep(2)}
            className={`cursor-pointer px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
              step === 2
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            Owner Account
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-700/60 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-400" /> Step 1: Institute Profile
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institute Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="e.g. Apex Academy of Science"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Institute Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={institutePhone}
                      onChange={(e) => setInstitutePhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Institute Email
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={instituteEmail}
                      onChange={(e) => setInstituteEmail(e.target.value)}
                      placeholder="info@institute.com"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Logo URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Education Boulevard, Suite 400..."
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all mt-4"
              >
                Continue to Owner Setup <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-700/60 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-400" /> Step 2: Owner Details
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700 font-mono">
                  Role: OWNER (Auto Assigned)
                </span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@institute.com"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Personal Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Role info banner */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  As the institute creator, your account is automatically assigned the <strong className="text-purple-300">OWNER</strong> role with full administration privileges.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition-colors"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Complete Setup <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-sm text-slate-400">
              Already have an institute account?{" "}
              <Link
                href="/login"
                className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
