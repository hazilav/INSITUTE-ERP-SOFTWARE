"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Archive,
  UserCheck,
  PauseCircle,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  BookOpen,
  Layers,
  Copy,
  Download,
  Share2,
  Lock,
  Link2,
  UserX,
} from "lucide-react";
import AddStudentModal from "@/components/AddStudentModal";
import EditStudentModal from "@/components/EditStudentModal";
import ArchiveStudentModal from "@/components/ArchiveStudentModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import RowActionMenu, { ActionItem } from "@/components/RowActionMenu";
import Toast from "@/components/Toast";
import ErrorState from "@/components/ErrorState";
import { getStudentPortalUrl, sharePortalLink } from "@/lib/urls";
import { fetchWithRetry } from "@/lib/api-client";

interface StudentRecord {
  id: string;
  student_code: string;
  name: string;
  photo?: string | null;
  phone: string;
  email?: string | null;
  learning_mode: string;
  status: string;
  course_id?: string | null;
  batch_id?: string | null;
  user?: {
    id: string;
    email: string;
    status: string;
    must_change_password?: boolean;
    updated_at?: string;
  } | null;
  course?: { id: string; name: string; code?: string | null } | null;
  batch?: { id: string; name: string; code?: string | null } | null;
}

interface Metrics {
  total: number;
  active: number;
  onHold: number;
  completed: number;
  atRisk: number;
}

export default function StudentDataCenterPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    active: 0,
    onHold: 0,
    completed: 0,
    atRisk: 0,
  });
  const [suggestedCode, setSuggestedCode] = useState("INS-2026-00001");
  const [loading, setLoading] = useState(true);

  // Filters & Active/Archived Tab State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debounce search input to avoid duplicate/rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [archivingStudent, setArchivingStudent] = useState<StudentRecord | null>(null);
  const [resettingStudent, setResettingStudent] = useState<StudentRecord | null>(null);

  const handleBulkArchive = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Are you sure you want to archive ${selectedStudentIds.length} selected students? Historical records will be preserved.`)) return;

    for (const id of selectedStudentIds) {
      await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });
    }
    setSelectedStudentIds([]);
    setToastMessage("Selected students archived.");
    fetchStudents();
  };

  const handleExportCSV = () => {
    const headers = "Student ID,Name,Phone,Email,Status,Learning Mode\n";
    const rows = students.map((s) => `"${s.student_code}","${s.name}","${s.phone}","${s.email || ""}","${s.status}","${s.learning_mode}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setToastMessage("Students exported to CSV.");
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (modeFilter !== "ALL") params.set("mode", modeFilter);
      params.set("archived", activeTab === "ARCHIVED" ? "true" : "false");

      const res = await fetchWithRetry<{
        success: boolean;
        students: StudentRecord[];
        metrics: any;
        suggestedCode?: string;
      }>(`/api/students?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setStudents(res.data.students || []);
        setMetrics(res.data.metrics || { total: 0, active: 0, onHold: 0, completed: 0, atRisk: 0 });
        if (res.data.suggestedCode) setSuggestedCode(res.data.suggestedCode);
      } else {
        setFetchError(res.error || "Failed to load student records.");
      }
    } catch (err: any) {
      console.error("Failed to fetch student data:", err);
      setFetchError("Unable to load students right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, modeFilter, activeTab]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "ON_HOLD":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPLETED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DROPPED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ARCHIVED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "offline":
        return { label: "🏫 Offline", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "online":
        return { label: "🌐 Online", style: "bg-purple-50 text-purple-700 border-purple-200" };
      case "hybrid":
        return { label: "🔄 Hybrid", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: "🔄 Hybrid", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Student Data Center</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Data Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage and monitor all students from one central place.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Real Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On Hold</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.onHold}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <PauseCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">At Risk / Dropped</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.atRisk}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Dynamic Search & Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        {/* Active | Archived Tabs & Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab("ACTIVE");
                setSelectedStudentIds([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ACTIVE"
                  ? "bg-white text-brand-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Active Roster ({metrics.active})
            </button>
            <button
              onClick={() => {
                setActiveTab("ARCHIVED");
                setSelectedStudentIds([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ARCHIVED"
                  ? "bg-white text-brand-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Archived ({metrics.total - metrics.active})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentIds.length > 0 && (
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-colors"
              >
                Archive ({selectedStudentIds.length})
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Student ID, phone or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Modes</option>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading student records...</p>
          </div>
        ) : fetchError && students.length === 0 ? (
          <ErrorState
            title="Failed to load students"
            message={fetchError}
            onRetry={fetchStudents}
            className="border-none shadow-none my-0"
          />
        ) : students.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === "ARCHIVED" ? "No archived students" : "No active students"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {search || statusFilter !== "ALL" || modeFilter !== "ALL"
                  ? "No student records match your current filters. Try resetting search."
                  : activeTab === "ARCHIVED"
                  ? "No students have been archived yet."
                  : "No students registered yet. Click 'Add Student' to create your first record."}
              </p>
            </div>
            {activeTab === "ACTIVE" && !(search || statusFilter !== "ALL" || modeFilter !== "ALL") && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Student
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View: Clean Student Cards (Section 6) */}
            <div className="block md:hidden p-4 space-y-3">
              {students.map((student) => {
                const isPortalActive = student.user?.status === "ACTIVE";
                return (
                  <div
                    key={student.id}
                    className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{student.name}</h4>
                        <p className="font-mono text-xs font-bold text-brand-600">{student.student_code}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${getStatusBadge(student.status)}`}>
                        {student.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 py-2 border-y border-slate-200/60">
                      <p>
                        Course: <strong className="text-slate-900">{student.course?.name || "—"}</strong>
                      </p>
                      <p>
                        Batch: <strong className="text-slate-900">{student.batch?.name || "—"}</strong>
                      </p>
                      <p className="text-slate-500 font-mono">Phone: {student.phone}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-500">
                        Portal:{" "}
                        <strong className={isPortalActive ? "text-emerald-600" : "text-slate-400"}>
                          {isPortalActive ? "Active" : "Inactive"}
                        </strong>
                      </span>

                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Clean Responsive Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(students.map((s) => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Student ID</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Portal</th>
                  <th className="px-6 py-3.5">Password</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((student) => {
                  const modeBadge = getModeBadge(student.learning_mode);
                  const initials = student.name
                    ? student.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "S";

                  const isSelected = selectedStudentIds.includes(student.id);
                  const isPortalActive = student.user?.status === "ACTIVE";
                  const passwordStatusLabel = student.user
                    ? student.user.must_change_password
                      ? "Temp Set"
                      : "Set"
                    : "Not Set";

                  const rowActions: ActionItem[] = [
                    {
                      label: "View Student",
                      icon: Eye,
                      onClick: () => {
                        window.location.href = `/dashboard/students/${student.id}`;
                      },
                    },
                    {
                      label: "Edit Student",
                      icon: Edit,
                      onClick: () => setEditingStudent(student),
                    },
                    {
                      label: "Copy Student ID",
                      icon: Copy,
                      onClick: () => {
                        navigator.clipboard.writeText(student.student_code);
                        setToastMessage("Student ID copied!");
                      },
                    },
                    {
                      label: "Copy Portal Link",
                      icon: Link2,
                      onClick: () => {
                        navigator.clipboard.writeText(getStudentPortalUrl());
                        setToastMessage("Student portal link copied!");
                      },
                    },
                    {
                      label: "Reset Password",
                      icon: Lock,
                      onClick: () => setResettingStudent(student),
                    },
                    {
                      label: "Share Login",
                      icon: Share2,
                      onClick: () => {
                        const url = getStudentPortalUrl();
                        const text = `Student Portal Link\nLogin here: ${url}\nStudent ID: ${student.student_code}`;
                        sharePortalLink("Student Portal", text, url, () => {
                          setToastMessage("Portal details copied to clipboard!");
                        });
                      },
                    },
                    {
                      label: isPortalActive ? "Deactivate Account" : "Reactivate Account",
                      icon: UserX,
                      onClick: async () => {
                        try {
                          const res = await fetch(`/api/students/${student.id}/toggle-portal`, { method: "POST" });
                          const data = await res.json();
                          if (data.success) {
                            setToastMessage(`Portal account ${data.status === "ACTIVE" ? "reactivated" : "deactivated"}.`);
                            fetchStudents();
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      },
                    },
                    {
                      label: student.status === "ARCHIVED" ? "Restore" : "Archive Student",
                      icon: Archive,
                      danger: student.status !== "ARCHIVED",
                      onClick: () => setArchivingStudent(student),
                    },
                  ];

                  return (
                    <tr key={student.id} className={`transition-colors ${isSelected ? "bg-brand-50/40" : "hover:bg-slate-50/60"}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, student.id]);
                            } else {
                              setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id));
                            }
                          }}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {student.photo ? (
                            <img
                              src={student.photo}
                              alt={student.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-600 text-xs">
                        {student.student_code}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {student.course?.name || <span className="text-slate-400 font-mono font-normal">—</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {student.batch?.name || <span className="text-slate-400 font-mono font-normal">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                            isPortalActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isPortalActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                            passwordStatusLabel === "Set"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : passwordStatusLabel === "Temp Set"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {passwordStatusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <RowActionMenu actions={rowActions} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          setToastMessage("Student added successfully.");
          fetchStudents();
        }}
        suggestedCode={suggestedCode}
      />

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            setToastMessage("Changes saved successfully.");
            fetchStudents();
          }}
          student={editingStudent}
        />
      )}

      {/* Archive Student Modal */}
      {archivingStudent && (
        <ArchiveStudentModal
          isOpen={!!archivingStudent}
          onClose={() => setArchivingStudent(null)}
          onSuccess={() => {
            setArchivingStudent(null);
            setToastMessage("Student status updated successfully.");
            fetchStudents();
          }}
          student={archivingStudent}
        />
      )}

      {/* Reset Password Modal */}
      {resettingStudent && (
        <ResetPasswordModal
          isOpen={!!resettingStudent}
          onClose={() => setResettingStudent(null)}
          onSuccess={() => {
            fetchStudents();
          }}
          studentId={resettingStudent.id}
          studentName={resettingStudent.name}
          studentCode={resettingStudent.student_code}
        />
      )}

      {/* Toast Feedback */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
