"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import Modal from "@/components/Modal";

interface LeaveManagementClientProps {
  instituteName: string;
}

export default function LeaveManagementClient({ instituteName }: LeaveManagementClientProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/leaves");
      const data = await res.json();
      if (data.success) {
        setReportData(data);
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Failed to fetch leave requests", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejection_reason: reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setRejectingLeaveId(null);
        setRejectionReason("");
        fetchLeaves();
      } else {
        setMessage({ type: "error", text: data.error || "Action failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Staff Leave Management & Approvals
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Review, Approve or Reject Staff Leave Requests — {instituteName}
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

      {/* KPI Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Requests</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{reportData.summary.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Awaiting Approval</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{reportData.summary.pendingCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Approved</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.summary.approvedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Rejected</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{reportData.summary.rejectedCount}</p>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Staff Leave Requests ({leaves.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading leave requests...</div>
        ) : leaves.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-center">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{l.staff.name}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{l.staff.employee_id} • {l.staff.role}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-700">{l.leave_type} Leave</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {new Date(l.start_date).toLocaleDateString()} – {new Date(l.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">{l.days_count} d</td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-600" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : l.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : l.status === "Rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {l.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(l.id, "approve")}
                            disabled={processing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setRejectingLeaveId(l.id)}
                            disabled={processing}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {l.status === "Approved" ? `Approved` : l.status === "Rejected" ? `Rejected` : `Cancelled`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No staff leave requests submitted yet.</div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingLeaveId && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingLeaveId(null)}
          title="Reject Leave Request"
          subtitle="Please provide a clear rejection reason for the staff member"
          icon={<XCircle className="w-5 h-5 text-rose-600" />}
          maxWidth="md"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setRejectingLeaveId(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction(rejectingLeaveId, "reject", rejectionReason)}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
              >
                {processing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <label className="block font-bold text-slate-700">Rejection Reason *</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter specific reason for rejecting this leave application..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
