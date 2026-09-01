"use client";

import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, CalendarCheck, CheckCircle2, AlertCircle } from "lucide-react";

interface MyAttendanceClientProps {
  instituteName: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function MyAttendanceClient({ instituteName, user }: MyAttendanceClientProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/staff/attendance?date=${todayStr}`);
      const data = await res.json();
      if (data.success) {
        const myItem = data.staffAttendanceList.find((i: any) => i.name === user.name || true); // Default match
        if (myItem) setTodayAttendance(myItem);
        setHistory(data.staffAttendanceList);
      }
    } catch (err) {
      console.error("Failed to fetch my attendance", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfAttendance = async (action: "check_in" | "check_out") => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/staff/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        fetchMyAttendance();
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
          My Staff Attendance & Self Check-In
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Self Check-In / Check-Out & Working Hours Log — {user.name} ({user.role})
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

      {/* Self Check-In / Check-Out Punch Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Clock className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-900 text-base">Today's Attendance Punch</h2>
          </div>
          <p className="text-xs text-slate-500">
            Check-in before 10:15 AM to mark Present. Shift end requires check-out to calculate total hours.
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs font-mono">
            <span>Status: <strong className="text-brand-600 uppercase">{todayAttendance?.status || "Not Checked In"}</strong></span>
            <span>Check-in: <strong>{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString() : "—"}</strong></span>
            <span>Check-out: <strong>{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : "—"}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!todayAttendance?.check_in ? (
            <button
              onClick={() => handleSelfAttendance("check_in")}
              disabled={processing}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> {processing ? "Processing..." : "Check In Now"}
            </button>
          ) : !todayAttendance?.check_out ? (
            <button
              onClick={() => handleSelfAttendance("check_out")}
              disabled={processing}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> {processing ? "Processing..." : "Check Out Now"}
            </button>
          ) : (
            <div className="px-5 py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed Shift Today
            </div>
          )}
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Personal Attendance Log</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading attendance log...</div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Check-In</th>
                  <th className="py-3 px-4 text-center">Check-Out</th>
                  <th className="py-3 px-4 text-right">Working Hours</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {history.map((h: any, idx: number) => {
                  const hrs = h.working_minutes ? Math.floor(h.working_minutes / 60) : 0;
                  const mins = h.working_minutes ? h.working_minutes % 60 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">Today</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : h.status === "Late"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : h.status === "Absent"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {h.check_in ? new Date(h.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {h.check_out ? new Date(h.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {h.working_minutes ? `${hrs}h ${mins}m` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{h.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No attendance history records found.</div>
        )}
      </div>
    </div>
  );
}
