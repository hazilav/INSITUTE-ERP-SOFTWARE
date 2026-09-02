"use client";

import { useState, useEffect } from "react";
import { Plus, ClipboardList, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import Modal from "@/components/Modal";

interface MyLeavesClientProps {
  instituteName: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function MyLeavesClient({ instituteName, user }: MyLeavesClientProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [leaveType, setLeaveType] = useState("Casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const fetchMyLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/leaves");
      const data = await res.json();
      if (data.success) {
        setMyLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Failed to fetch my leaves", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/staff/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowModal(false);
        setStartDate("");
        setEndDate("");
        setReason("");
        fetchMyLeaves();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to submit leave request." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this pending leave request?")) return;

    setMessage(null);
    try {
      const res = await fetch(`/api/staff/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Leave request cancelled." });
        fetchMyLeaves();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to cancel leave request." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Leave Requests & History
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Submit & Track Leave Applications — {user.name} ({user.role})
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
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

      {/* My Leave Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">My Leave History ({myLeaves.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading leave applications...</div>
        ) : myLeaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4 text-center">Days</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {myLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-brand-700">{l.leave_type} Leave</td>
                    <td className="py-3.5 px-4 font-mono">{new Date(l.start_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono">{new Date(l.end_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">{l.days_count} d</td>
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <span className="block truncate">{l.reason}</span>
                      {l.rejection_reason && (
                        <span className="text-rose-600 font-bold block text-[11px] mt-0.5">
                          Rejection Reason: {l.rejection_reason}
                        </span>
                      )}
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
                        <button
                          onClick={() => handleCancelLeave(l.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-[11px] transition-colors"
                        >
                          Cancel Request
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">You haven't submitted any leave requests yet.</div>
        )}
      </div>

      {/* Request Leave Modal */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title="Request Leave Application"
          subtitle="Submit an official leave request to administrative management"
          icon={<ClipboardList className="w-5 h-5 text-brand-600" />}
          maxWidth="md"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitLeave}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Emergency">Emergency Leave</option>
                <option value="Personal">Personal Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason *</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide reason for leave request..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
