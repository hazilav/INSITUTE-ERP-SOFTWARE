"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  X,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { fetchWithRetry } from "@/lib/api-client";

const CreateActivityModal = dynamic(() => import("@/components/CreateActivityModal"), { ssr: false });

interface ActivityItem {
  id: string;
  title: string;
  activity_type: string;
  submission_type: string;
  assigned_date: string;
  due_date: string;
  maximum_marks: number;
  status: string;
  submission_count: number;
  pending_review_count: number;
  is_overdue: boolean;
  course: { id: string; name: string; code?: string | null };
  batch: { id: string; name: string; code?: string | null };
  mentor?: { id: string; name: string } | null;
}

interface SelectOption {
  id: string;
  name: string;
  code?: string | null;
}

interface Metrics {
  total: number;
  active: number;
  pendingReview: number;
  completed: number;
  overdue: number;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    active: 0,
    pendingReview: 0,
    completed: 0,
    overdue: 0,
  });
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [activeBatches, setActiveBatches] = useState<SelectOption[]>([]);
  const [instituteMode, setInstituteMode] = useState("hybrid");
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (batchFilter !== "ALL") params.set("batch_id", batchFilter);
      if (typeFilter !== "ALL") params.set("activity_type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        activities: ActivityItem[];
        metrics: any;
        activeCourses: SelectOption[];
        activeBatches: SelectOption[];
        instituteMode?: string;
      }>(`/api/activities?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setActivities(res.data.activities || []);
        setMetrics(res.data.metrics || { total: 0, active: 0, pendingReview: 0, completed: 0, overdue: 0 });
        setActiveCourses(res.data.activeCourses || []);
        setActiveBatches(res.data.activeBatches || []);
        setInstituteMode(res.data.instituteMode || "hybrid");
      } else {
        setFetchError(res.error || "Failed to load activities.");
      }
    } catch (err: any) {
      console.error("Failed to fetch activities", err);
      setFetchError("Unable to load activities right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, courseFilter, batchFilter, typeFilter, statusFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === "Published" && isOverdue) {
      return { label: "⚠️ Overdue", style: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    switch (status) {
      case "Published":
        return { label: "Active", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "Draft":
        return { label: "Draft", style: "bg-slate-50 text-slate-700 border-slate-200" };
      case "Closed":
        return { label: "Closed", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "Archived":
        return { label: "Archived", style: "bg-amber-50 text-amber-700 border-amber-200" };
      default:
        return { label: status, style: "bg-slate-50 text-slate-700 border-slate-200" };
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
        <span className="text-slate-900 font-bold">Activities</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Activities & Assignments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage course assignments, projects, quizzes, online/offline student submissions, and mentor reviews.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingActivity(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all w-full sm:w-auto min-h-[42px]"
        >
          <Plus className="w-4 h-4" /> Create Activity
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Activities</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Published</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{metrics.pendingReview}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{metrics.overdue}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities by title, description, or module..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Batches</option>
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="Assignment">Assignment</option>
              <option value="Project">Project</option>
              <option value="Quiz">Quiz</option>
              <option value="Practical">Practical</option>
              <option value="Homework">Homework</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : fetchError && activities.length === 0 ? (
          <ErrorState
            title="Failed to load activities"
            message={fetchError}
            onRetry={fetchActivities}
            className="border-none shadow-none my-0"
          />
        ) : activities.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No activities found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create your first assignment, project, or homework task for your batches.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingActivity(null);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Activity
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[750px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5 text-center">Submissions</th>
                  <th className="px-6 py-3.5 text-center">Pending Review</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activities.map((act) => {
                  const statusBadge = getStatusBadge(act.status, act.is_overdue);
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/activities/${act.id}`}
                          className="font-bold text-slate-900 hover:text-brand-600 hover:underline text-sm block"
                        >
                          {act.title}
                        </Link>
                        <span className="text-xs text-slate-400 capitalize">
                          Method: {act.submission_type} • Max Marks: {act.maximum_marks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {act.course?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {act.batch?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {act.activity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {new Date(act.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {act.submission_count}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">
                        {act.pending_review_count}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${statusBadge.style}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/activities/${act.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Submissions Roster"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingActivity(act);
                              setCreateModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Activity"
                          >
                            <Edit className="w-4 h-4" />
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

      {/* Create / Edit Activity Modal */}
      <CreateActivityModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchActivities}
        instituteMode={instituteMode}
        editingActivity={editingActivity}
      />
    </div>
  );
}
