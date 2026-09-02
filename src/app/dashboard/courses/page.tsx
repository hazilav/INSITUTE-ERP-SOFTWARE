"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import Link from "next/link";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { fetchWithRetry } from "@/lib/api-client";
import {
  BookOpen,
  Layers,
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
} from "lucide-react";

interface CourseRecord {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  duration?: string | null;
  learning_mode: string;
  status: string;
  _count?: {
    batches: number;
    students: number;
  };
}

interface Metrics {
  total: number;
  active: number;
  draft: number;
  archived: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, draft: 0, archived: 0 });
  const [instituteMode, setInstituteMode] = useState("hybrid");
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debounce search input to avoid duplicate/rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);

  // Create Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [learningMode, setLearningMode] = useState("hybrid");
  const [status, setStatus] = useState("Active");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        courses: CourseRecord[];
        metrics: any;
        instituteMode?: string;
      }>(`/api/courses?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setCourses(res.data.courses || []);
        setMetrics(res.data.metrics || { total: 0, active: 0, draft: 0, archived: 0 });
        if (res.data.instituteMode) {
          setInstituteMode(res.data.instituteMode);
          setLearningMode(res.data.instituteMode);
        }
      } else {
        setFetchError(res.error || "Failed to load courses.");
      }
    } catch (err: any) {
      console.error("Failed to fetch courses", err);
      setFetchError("Unable to load courses right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          description,
          duration,
          learning_mode: learningMode,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      setName("");
      setCode("");
      setDescription("");
      setDuration("");
      setCreateModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          description,
          duration,
          learning_mode: learningMode,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update course");
      }

      setEditingCourse(null);
      fetchCourses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchiveCourse = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive course "${name}"?`)) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (res.ok) fetchCourses();
    } catch (err) {
      console.error("Archive course error", err);
    }
  };

  const openEditModal = (course: CourseRecord) => {
    setEditingCourse(course);
    setName(course.name || "");
    setCode(course.code || "");
    setDescription(course.description || "");
    setDuration(course.duration || "");
    setLearningMode(course.learning_mode || "hybrid");
    setStatus(course.status || "Active");
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Draft":
        return "bg-amber-50 text-amber-700 border-amber-200";
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
        <span className="text-slate-900 font-bold">Courses</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Courses
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage academic course offerings and mode configurations.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setCode("");
            setDescription("");
            setDuration("");
            setFormError("");
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Course
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Courses</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Courses</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Courses</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.draft}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived Courses</p>
            <p className="text-2xl font-extrabold text-slate-500 mt-1">{metrics.archived}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
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
            placeholder="Search courses by name or code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : fetchError && courses.length === 0 ? (
          <ErrorState
            title="Failed to load courses"
            message={fetchError}
            onRetry={fetchCourses}
            className="border-none shadow-none my-0"
          />
        ) : courses.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No courses created yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create your first academic course to begin setting up batches.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Mode</th>
                  <th className="px-6 py-3.5">Batches</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {courses.map((course) => {
                  const modeBadge = getModeBadge(course.learning_mode);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{course.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[220px]">
                          {course.description || "No description"}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-600 text-xs">
                        {course.code || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs">{course.duration || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${modeBadge.style}`}>
                          {modeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">
                        {course._count?.batches || 0} batches
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadge(course.status)}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/courses/${course.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Course Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(course)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Course"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveCourse(course.id, course.name)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Archive Course"
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
        isOpen={createModalOpen || !!editingCourse}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingCourse(null);
        }}
        title={editingCourse ? "Edit Course" : "Create New Course"}
        subtitle={`Mode choices respect institute operating setup (${instituteMode})`}
        icon={<BookOpen className="w-5 h-5 text-brand-600" />}
        maxWidth="2xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingCourse(null);
              }}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editingCourse ? handleEditCourse : handleCreateCourse}
              disabled={formLoading}
              className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {formLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : editingCourse ? (
                "Save Changes"
              ) : (
                "Create Course"
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

        <form onSubmit={editingCourse ? handleEditCourse : handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master in Web Development"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WEB-101"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 6 Months"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Course curriculum and objective summary..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Learning Mode
              </label>
              <select
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white capitalize"
              >
                {instituteMode === "offline" ? (
                  <option value="offline">🏫 Offline Only</option>
                ) : instituteMode === "online" ? (
                  <option value="online">🌐 Online Only</option>
                ) : (
                  <>
                    <option value="hybrid">🔄 Hybrid</option>
                    <option value="offline">🏫 Offline</option>
                    <option value="online">🌐 Online</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
