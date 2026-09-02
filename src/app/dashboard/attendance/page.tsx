"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Edit,
  X,
  AlertCircle,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  CalendarDays,
} from "lucide-react";
import MarkAttendanceModal from "@/components/MarkAttendanceModal";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { fetchWithRetry } from "@/lib/api-client";

interface AttendanceRecordItem {
  id: string;
  date: string;
  status: string;
  class_type: string;
  remarks?: string | null;
  student: { id: string; student_code: string; name: string; phone: string };
  course: { id: string; name: string; code?: string | null };
  batch: { id: string; name: string; code?: string | null };
  classItem: { id: string; title: string; class_type: string; room?: string | null };
}

interface SelectOption {
  id: string;
  name: string;
  code?: string | null;
}

interface Metrics {
  percentage: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  totalToday: number;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    percentage: "0.00%",
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    totalToday: 0,
  });
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [activeBatches, setActiveBatches] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debounce search input to avoid duplicate/rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals State
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordItem | null>(null);
  const [editStatus, setEditStatus] = useState("Present");
  const [editRemarks, setEditRemarks] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dateFilter) params.set("date", dateFilter);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (batchFilter !== "ALL") params.set("batch_id", batchFilter);
      if (typeFilter !== "ALL") params.set("class_type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        records: AttendanceRecordItem[];
        metrics: Metrics;
        activeCourses: SelectOption[];
        activeBatches: SelectOption[];
      }>(`/api/attendance?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setRecords(res.data.records || []);
        setMetrics(res.data.metrics || { percentage: "0.00%", present: 0, absent: 0, late: 0, leave: 0, totalToday: 0 });
        setActiveCourses(res.data.activeCourses || []);
        setActiveBatches(res.data.activeBatches || []);
      } else {
        setFetchError(res.error || "Failed to load attendance records.");
      }
    } catch (err: any) {
      console.error("Failed to fetch attendance data", err);
      setFetchError("Unable to load attendance records right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFilter, courseFilter, batchFilter, typeFilter, statusFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditLoading(true);

    try {
      const res = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          remarks: editRemarks,
        }),
      });

      if (res.ok) {
        setEditingRecord(null);
        fetchAttendance();
      }
    } catch (err) {
      console.error("Edit attendance error", err);
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Present":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Absent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Late":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Leave":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getClassTypeBadge = (t: string) => {
    switch (t) {
      case "physical":
        return { label: "🏫 Physical", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "live_online":
        return { label: "🌐 Live Online", style: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: "🏫 Physical", style: "bg-blue-50 text-blue-700 border-blue-200" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Attendance</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor real-time class attendance, record session logs, and track low attendance alerts.
          </p>
        </div>

        <button
          onClick={() => setMarkModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Mark Attendance
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance %</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{metrics.percentage}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.present}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.absent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.late}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{metrics.leave}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history by student name, Student ID, or class..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="ALL">All Batches</option>
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : fetchError && records.length === 0 ? (
          <ErrorState
            title="Failed to load attendance"
            message={fetchError}
            onRetry={fetchAttendance}
            className="border-none shadow-none my-0"
          />
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No attendance records found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Click 'Mark Attendance' to record session attendance for your batches.
              </p>
            </div>
            <button
              onClick={() => setMarkModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Mark Attendance
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Class</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((rec) => {
                  const typeBadge = getClassTypeBadge(rec.class_type);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {new Date(rec.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/students/${rec.student.id}`}
                          className="font-bold text-slate-900 hover:text-brand-600 hover:underline text-sm block"
                        >
                          {rec.student.name}
                        </Link>
                        <span className="font-mono text-brand-600 text-xs">ID: {rec.student.student_code}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {rec.course?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {rec.batch?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700">
                        {rec.classItem?.title || "Class Session"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${typeBadge.style}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${getStatusBadge(rec.status)}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingRecord(rec);
                            setEditStatus(rec.status);
                            setEditRemarks(rec.remarks || "");
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Attendance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Attendance Modal */}
      <MarkAttendanceModal
        isOpen={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        onSuccess={fetchAttendance}
      />

      {/* Edit Attendance Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Edit Attendance Record</h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: <strong className="text-slate-800">{editingRecord.student.name}</strong> ({editingRecord.student.student_code})
            </p>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  <option value="Present">🟢 Present</option>
                  <option value="Absent">🔴 Absent</option>
                  <option value="Late">🟡 Late</option>
                  <option value="Leave">🔵 Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Reason
                </label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Medical leave approved"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {editLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
