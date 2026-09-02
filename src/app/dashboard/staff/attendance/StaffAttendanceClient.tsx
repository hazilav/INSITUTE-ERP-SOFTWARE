"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Save,
  Filter,
  Eye,
  CheckCheck,
} from "lucide-react";

interface StaffAttendanceClientProps {
  instituteName: string;
}

export default function StaffAttendanceClient({ instituteName }: StaffAttendanceClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [staffItems, setStaffItems] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, departmentFilter]);

  const fetchAttendance = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let url = `/api/staff/attendance?date=${selectedDate}`;
      if (departmentFilter !== "ALL") url += `&department=${departmentFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
        setStaffItems(data.staffAttendanceList);
      }
    } catch (err) {
      console.error("Failed to fetch staff attendance", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (staffId: string, status: string) => {
    setStaffItems((prev) =>
      prev.map((item) => (item.staff_id === staffId ? { ...item, status } : item))
    );
  };

  const handleNotesChange = (staffId: string, notes: string) => {
    setStaffItems((prev) =>
      prev.map((item) => (item.staff_id === staffId ? { ...item, notes } : item))
    );
  };

  const handleMarkAllPresent = () => {
    setStaffItems((prev) =>
      prev.map((item) => (item.status === "Leave" ? item : { ...item, status: "Present" }))
    );
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const recordsToSave = staffItems.map((item) => ({
        staff_id: item.staff_id,
        status: item.status === "Not Marked" ? "Absent" : item.status,
        check_in: item.check_in,
        check_out: item.check_out,
        notes: item.notes,
      }));

      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          records: recordsToSave,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message || "Attendance saved successfully!" });
        fetchAttendance();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save attendance." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error while saving attendance." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff & Mentor Attendance Management
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Daily Staff Roster Attendance & Working Hours Tracking — {instituteName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" /> Mark All Present
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
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

      {/* Date & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <CalendarCheck className="w-4 h-4 text-brand-600" />
            <span>Attendance Date:</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Academics">Academics</option>
            <option value="Administration">Administration</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present Today</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{reportData.summary.presentToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase">Late Today</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{reportData.summary.lateToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase">Absent Today</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{reportData.summary.absentToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase">Half Day</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{reportData.summary.halfDayToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-600 uppercase">On Leave</span>
            <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{reportData.summary.onLeaveToday}</p>
          </div>
        </div>
      )}

      {/* Staff Attendance Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Daily Staff Roster ({staffItems.length})
          </h3>
          <span className="text-xs text-slate-400">
            Work Start: <strong>{reportData?.workingHours?.work_start_time || "10:00 AM"}</strong> (Late threshold: +{reportData?.workingHours?.late_threshold_mins || 15} mins)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading staff attendance roster...</div>
        ) : staffItems.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4 text-center">Attendance Status</th>
                  <th className="py-3 px-4 text-center">Check-In / Out</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {staffItems.map((item) => (
                  <tr key={item.staff_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{item.employee_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brand-700">{item.role}</span>
                      <span className="text-slate-400 block text-[11px]">{item.department}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.staff_id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border focus:outline-none ${
                          item.status === "Present"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "Late"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : item.status === "Absent"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.status === "Half Day"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : item.status === "Leave"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <option value="Not Marked">Not Marked</option>
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Absent">Absent</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                      {item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      {" - "}
                      {item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        placeholder="Add notes..."
                        value={item.notes || ""}
                        onChange={(e) => handleNotesChange(item.staff_id, e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none text-xs"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/staff/${item.staff_id}`}
                        className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No staff members found.</div>
        )}
      </div>
    </div>
  );
}
