"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import Link from "next/link";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { fetchWithRetry } from "@/lib/api-client";
import {
  Layers,
  BookOpen,
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Archive,
  X,
  AlertCircle,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react";

interface BatchRecord {
  id: string;
  name: string;
  code?: string | null;
  course_id: string;
  course?: { id: string; name: string; code?: string | null };
  start_date?: string | null;
  end_date?: string | null;
  learning_mode: string;
  status: string;
  classroom?: string | null;
  days?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  _count?: {
    students: number;
  };
}

interface CourseOption {
  id: string;
  name: string;
  code?: string | null;
  learning_mode: string;
}

interface Metrics {
  total: number;
  active: number;
  upcoming: number;
  completed: number;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, upcoming: 0, completed: 0 });
  const [activeCourses, setActiveCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debounce search input to avoid duplicate/rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRecord | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [learningMode, setLearningMode] = useState("hybrid");
  const [status, setStatus] = useState("Active");
  const [classroom, setClassroom] = useState("");
  const [days, setDays] = useState("Mon, Wed, Fri");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        batches: BatchRecord[];
        metrics: Metrics;
        activeCourses: CourseOption[];
      }>(`/api/batches?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setBatches(res.data.batches || []);
        setMetrics(res.data.metrics || { total: 0, active: 0, upcoming: 0, completed: 0 });
        setActiveCourses(res.data.activeCourses || []);
        if (res.data.activeCourses && res.data.activeCourses.length > 0 && !courseId) {
          setCourseId(res.data.activeCourses[0].id);
        }
      } else {
        setFetchError(res.error || "Failed to load batches.");
      }
    } catch (err: any) {
      console.error("Failed to fetch batches", err);
      setFetchError("Unable to load batches right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, courseFilter, courseId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          course_id: courseId,
          start_date: startDate,
          end_date: endDate,
          learning_mode: learningMode,
          status,
          classroom,
          days,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create batch");
      }

      setName("");
      setCode("");
      setClassroom("");
      setCreateModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch(`/api/batches/${editingBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          course_id: courseId,
          start_date: startDate,
          end_date: endDate,
          learning_mode: learningMode,
          status,
          classroom,
          days,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update batch");
      }

      setEditingBatch(null);
      fetchBatches();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchiveBatch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive batch "${name}"?`)) return;
    try {
      const res = await fetch(`/api/batches/${id}`, { method: "DELETE" });
      if (res.ok) fetchBatches();
    } catch (err) {
      console.error("Archive batch error", err);
    }
  };

  const openEditModal = (batch: BatchRecord) => {
    setEditingBatch(batch);
    setName(batch.name || "");
    setCode(batch.code || "");
    setCourseId(batch.course_id || "");
    setStartDate(batch.start_date ? new Date(batch.start_date).toISOString().split("T")[0] : "");
    setEndDate(batch.end_date ? new Date(batch.end_date).toISOString().split("T")[0] : "");
    setLearningMode(batch.learning_mode || "hybrid");
    setStatus(batch.status || "Active");
    setClassroom(batch.classroom || "");
    setDays(batch.days || "Mon, Wed, Fri");
    setStartTime(batch.start_time || "10:00 AM");
    setEndTime(batch.end_time || "12:00 PM");
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Upcoming":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Archived":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getModeBadge = (m: string) => {
    switch (m) {
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
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Batches</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Batches
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage course batches, schedules, and classroom allocations.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setCode("");
            setClassroom("");
            setFormError("");
            setCreateModalOpen(true);
          }}
          disabled={activeCourses.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all w-full sm:w-auto min-h-[42px] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Create Batch
        </button>
      </div>

      {/* Warning Banner if No Active Courses Exist */}
      {activeCourses.length === 0 && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No active courses found. Please create a course first before managing batches.</span>
          </div>
          <Link href="/dashboard/courses" className="font-bold underline text-amber-900">
            Create Course &rarr;
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Batches</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Batches</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Batches</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{metrics.upcoming}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-slate-500 mt-1">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches by name, code or room..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Batch Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : fetchError && batches.length === 0 ? (
          <ErrorState
            title="Failed to load batches"
            message={fetchError}
            onRetry={fetchBatches}
            className="border-none shadow-none my-0"
          />
        ) : batches.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No batches created yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create a batch under an active course to begin scheduling.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              disabled={activeCourses.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Create Batch
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5 text-right">Students</th>
                  <th className="px-6 py-3.5">Mode</th>
                  <th className="px-6 py-3.5">Start Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {batches.map((batch) => {
                  const modeBadge = getModeBadge(batch.learning_mode);
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{batch.name}</p>
                        <p className="text-xs font-mono text-brand-600">
                          {batch.code || "—"} {batch.classroom ? `• Room: ${batch.classroom}` : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-xs">{batch.course?.name || "—"}</p>
                        <p className="text-[11px] font-mono text-slate-400">{batch.course?.code}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">
                        {batch._count?.students || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${modeBadge.style}`}>
                          {modeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadge(batch.status)}`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/batches/${batch.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Batch Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(batch)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Batch"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveBatch(batch.id, batch.name)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Archive Batch"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={createModalOpen || !!editingBatch}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingBatch(null);
        }}
        title={editingBatch ? "Edit Batch" : "Create New Batch"}
        subtitle="Configure batch schedule, parent course, and classroom mode"
        icon={<Layers className="w-5 h-5 text-brand-600" />}
        maxWidth="2xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingBatch(null);
              }}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editingBatch ? handleEditBatch : handleCreateBatch}
              disabled={formLoading}
              className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {formLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : editingBatch ? (
                "Save Changes"
              ) : (
                "Create Batch"
              )}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={editingBatch ? handleEditBatch : handleCreateBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Parent Course <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="">Select active course...</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || "No code"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Batch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Digital Marketing - Batch 04"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. DM-04"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Learning Mode
              </label>
              <select
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white capitalize"
              >
                <option value="offline">🏫 Offline</option>
                <option value="online">🌐 Online</option>
                <option value="hybrid">🔄 Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {(learningMode === "offline" || learningMode === "hybrid") && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Classroom / Room Number
              </label>
              <input
                type="text"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                placeholder="e.g. Room 201"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Days
              </label>
              <input
                type="text"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Mon, Wed, Fri"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="12:00 PM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Batch Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
