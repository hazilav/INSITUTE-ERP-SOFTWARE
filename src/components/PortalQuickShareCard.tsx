"use client";

import { useState } from "react";
import { GraduationCap, ShieldCheck, Copy, Share2, Link2 } from "lucide-react";
import { getStudentPortalUrl, getStaffPortalUrl, sharePortalLink } from "@/lib/urls";
import Toast from "./Toast";

interface PortalQuickShareCardProps {
  customDomain?: string | null;
}

export default function PortalQuickShareCard({ customDomain }: PortalQuickShareCardProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const studentUrl = getStudentPortalUrl(customDomain);
  const staffUrl = getStaffPortalUrl(customDomain);

  const handleCopyStudent = () => {
    navigator.clipboard.writeText(studentUrl);
    setToastMessage("Student portal link copied!");
  };

  const handleShareStudent = () => {
    const text = `Student Portal\nLogin here: ${studentUrl}\nUse your Student ID and password to login.`;
    sharePortalLink("Student Portal", text, studentUrl, () => {
      setToastMessage("Student portal link copied!");
    });
  };

  const handleCopyStaff = () => {
    navigator.clipboard.writeText(staffUrl);
    setToastMessage("Staff portal link copied!");
  };

  const handleShareStaff = () => {
    const text = `Staff Portal\nLogin here: ${staffUrl}\nUse your staff email and password to login.`;
    sharePortalLink("Staff Portal", text, staffUrl, () => {
      setToastMessage("Staff portal link copied!");
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
          <Link2 className="w-4 h-4 text-brand-600" /> Portal Login Links & Quick Sharing
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">Instant Access Links</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Student Portal Card */}
        <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200/60 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" /> Student Portal
            </span>
            <p className="font-mono text-[11px] text-brand-700 truncate">{studentUrl}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyStudent}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 shadow-xs flex items-center gap-1 transition-colors"
              title="Copy Student Portal Link"
            >
              <Copy className="w-3.5 h-3.5 text-brand-600" /> Copy
            </button>
            <button
              onClick={handleShareStudent}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1 transition-colors"
              title="Share Student Portal Link"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>

        {/* Staff Portal Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" /> Staff Portal
            </span>
            <p className="font-mono text-[11px] text-purple-700 truncate">{staffUrl}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyStaff}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 shadow-xs flex items-center gap-1 transition-colors"
              title="Copy Staff Portal Link"
            >
              <Copy className="w-3.5 h-3.5 text-brand-600" /> Copy
            </button>
            <button
              onClick={handleShareStaff}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs flex items-center gap-1 transition-colors"
              title="Share Staff Portal Link"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
