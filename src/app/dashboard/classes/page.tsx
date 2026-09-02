"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import Link from "next/link";
import ErrorState from "@/components/ErrorState";
import { fetchWithRetry } from "@/lib/api-client";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  X,
  AlertCircle,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Video,
  PlayCircle,
  MapPin,
  Link2,
} from "lucide-react";

interface ClassItem {
  id: string;
  title: string;
  topic?: string | null;
  description?: string | null;
  class_type: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  meeting_link?: string | null;
  content_url?: string | null;
  status: string;
  course?: { id: string; name: string; code?: string | null };
  batch?: { id: string; name: string; code?: string | null };
  mentor?: { id: string; name: string; role: string };
}

interface SelectOption {
  id: string;
  name: string;
  code?: string | null;
  course_id?: string;
  role?: string;
}

interface Metrics {
  today: number;
  upcoming: number;
  completed: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ today: 0, upcoming: 0, completed: 0 });
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [activeBatches, setActiveBatches] = useState<SelectOption[]>([]);
  const [mentors, setMentors] = useState<SelectOption[]>([]);
  const [instituteMode, setInstituteMode] = useState("hybrid");
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

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [classType, setClassType] = useState("physical");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("11:30 AM");
  const [room, setRoom] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [status, setStatus] = useState("Scheduled");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchClasses = useCallback(async () => {
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
        classes: ClassItem[];
        metrics: any;
        activeCourses: SelectOption[];
        activeBatches: SelectOption[];
        mentors: any[];
        instituteMode?: string;
      }>(`/api/classes?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setClasses(res.data.classes || []);
        setMetrics(res.data.metrics || { today: 0, upcoming: 0, completed: 0 });
        setActiveCourses(res.data.activeCourses || []);
        setActiveBatches(res.data.activeBatches || []);
        setMentors(res.data.mentors || []);
        if (res.data.instituteMode) {
          setInstituteMode(res.data.instituteMode);
          if (res.data.instituteMode === "online") setClassType("live_online");
        }
      } else {
        setFetchError(res.error || "Failed to load scheduled classes.");
      }
    } catch (err: any) {
      console.error("Failed to fetch classes", err);
      setFetchError("Unable to load classes right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFilter, courseFilter, batchFilter, typeFilter, statusFilter]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course_id: courseId,
          batch_id: batchId,
          mentor_id: mentorId || null,
          topic,
          description,
          class_type: classType,
          date,
          start_time: startTime,
          end_time: endTime,
          room,
          meeting_link: meetingLink,
          content_url: contentUrl,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create class");

      setTitle("");
      setTopic("");
      setRoom("");
      setMeetingLink("");
      setContentUrl("");
      setCreateModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course_id: courseId,
          batch_id: batchId,
          mentor_id: mentorId || null,
          topic,
          description,
          class_type: classType,
          date,
          start_time: startTime,
          end_time: endTime,
          room,
          meeting_link: meetingLink,
          content_url: contentUrl,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update class");

      setEditingClass(null);
      fetchClasses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClass = async (id: string, classTitle: string) => {
    if (!confirm(`Are you sure you want to delete class "${classTitle}"?`)) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) fetchClasses();
    } catch (err) {
      console.error("Delete class error", err);
    }
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setTitle(c.title);
    setCourseId(c.course?.id || "");
    setBatchId(c.batch?.id || "");
    setMentorId(c.mentor?.id || "");
    setTopic(c.topic || "");
    setDescription(c.description || "");
    setClassType(c.class_type);
    setDate(new Date(c.date).toISOString().split("T")[0]);
    setStartTime(c.start_time || "10:00 AM");
    setEndTime(c.end_time || "11:30 AM");
    setRoom(c.room || "");
    setMeetingLink(c.meeting_link || "");
    setContentUrl(c.content_url || "");
    setStatus(c.status);
  };

  const getClassTypeBadge = (t: string) => {
    switch (t) {
      case "physical":
        return { label: "🏫 Physical", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "live_online":
        return { label: "🌐 Live Online", style: "bg-purple-50 text-purple-700 border-purple-200" };
      case "recorded":
        return { label: "🎥 Recorded", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: "🏫 Physical", style: "bg-blue-50 text-blue-700 border-blue-200" };
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Live":
        return "bg-purple-50 text-purple-700 border-purple-200 animate-pulse";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Filter batches based on selected course in create form
  const filteredFormBatches = courseId
    ? activeBatches.filter((b) => b.course_id === courseId)
    : activeBatches;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Classes</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Classes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Schedule physical classrooms, live online sessions, and recorded video classes.
          </p>
        </div>

        <button
          onClick={() => {
            setTitle("");
            setTopic("");
            setRoom("");
            setMeetingLink("");
            setContentUrl("");
            if (activeCourses.length > 0) setCourseId(activeCourses[0].id);
            if (activeBatches.length > 0) setBatchId(activeBatches[0].id);
            setFormError("");
            setCreateModalOpen(true);
          }}
          disabled={activeCourses.length === 0 || activeBatches.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Create Class
        </button>
      </div>

      {/* Warning Banner if Courses/Batches Missing */}
      {(activeCourses.length === 0 || activeBatches.length === 0) && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Please ensure at least 1 active course and batch are created before scheduling classes.</span>
          </div>
          <Link href="/dashboard/courses" className="font-bold underline text-amber-900">
            Setup Courses &rarr;
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Classes</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.today}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Classes</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1">{metrics.upcoming}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Classes</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes by title, topic or classroom..."
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
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="physical">Physical</option>
              <option value="live_online">Live Online</option>
              <option value="recorded">Recorded</option>
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
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Class List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading scheduled classes...</p>
          </div>
        ) : fetchError && classes.length === 0 ? (
          <ErrorState
            title="Failed to load classes"
            message={fetchError}
            onRetry={fetchClasses}
            className="border-none shadow-none my-0"
          />
        ) : classes.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No classes scheduled</h3>
              <p className="text-xs text-slate-500 mt-1">
                No classes match your current search filters or date.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              disabled={activeCourses.length === 0 || activeBatches.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Create Class
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Class Title</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Mentor</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classes.map((item) => {
                  const typeBadge = getClassTypeBadge(item.class_type);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">
                          {item.topic ? `Topic: ${item.topic}` : "No topic"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {item.course?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                        {item.batch?.name || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${typeBadge.style}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700">
                        {item.mentor?.name || "Staff"}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <p className="font-bold text-slate-900">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                        <p className="text-slate-400 font-mono text-[11px]">
                          {item.start_time || "—"} – {item.end_time || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/classes/${item.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Class Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Class"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(item.id, item.title)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-4 h-4" />
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
        isOpen={createModalOpen || !!editingClass}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingClass(null);
        }}
        title={editingClass ? "Edit Class" : "Create New Class"}
        subtitle={`Configure class schedule and mode specifications (${instituteMode})`}
        icon={<GraduationCap className="w-5 h-5 text-brand-600" />}
        maxWidth="2xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingClass(null);
              }}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editingClass ? handleEditClass : handleCreateClass}
              disabled={formLoading}
              className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {formLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : editingClass ? (
                "Save Changes"
              ) : (
                "Create Class"
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

        <form onSubmit={editingClass ? handleEditClass : handleCreateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to React State"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  const matching = activeBatches.filter((b) => b.course_id === e.target.value);
                  if (matching.length > 0) setBatchId(matching[0].id);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select course...</option>
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Select batch...</option>
                {filteredFormBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Module / Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Module 3: Hooks"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Mentor
              </label>
              <select
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              >
                <option value="">Default Staff Mentor</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                placeholder="11:30 AM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Mode-Dependent Class Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class Type
              </label>
              <select
                value={classType}
                onChange={(e) => setClassType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold"
              >
                <option value="physical">Offline Classroom</option>
                <option value="live_online">Live Online</option>
                <option value="hybrid">Hybrid (Offline + Online)</option>
              </select>
            </div>

            {(classType === "physical" || classType === "hybrid") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Classroom / Room Number
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Lab 2 / Room 104"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            )}
          </div>

          {(classType === "live_online" || classType === "hybrid") && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                Online Meeting Link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij or Zoom link"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Agenda
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline key topics to be covered during session..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
