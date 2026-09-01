"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlayCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  X,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Video,
  Clock,
  ExternalLink,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  course_id: string;
  module_name?: string | null;
  description?: string | null;
  video_url: string;
  duration?: string | null;
  publish_status: string;
  created_at: string;
  course?: { id: string; name: string; code?: string | null };
}

interface SelectOption {
  id: string;
  name: string;
  code?: string | null;
}

export default function RecordedContentPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [instituteMode, setInstituteMode] = useState("hybrid");
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("45 mins");
  const [publishStatus, setPublishStatus] = useState("Published");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (statusFilter !== "ALL") params.set("publish_status", statusFilter);

      const res = await fetch(`/api/content?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setContents(data.contents || []);
        setActiveCourses(data.activeCourses || []);
        setInstituteMode(data.instituteMode || "hybrid");
        if (data.activeCourses && data.activeCourses.length > 0 && !courseId) {
          setCourseId(data.activeCourses[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch content", err);
    } finally {
      setLoading(false);
    }
  }, [search, courseFilter, statusFilter, courseId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course_id: courseId,
          module_name: moduleName,
          description,
          video_url: videoUrl,
          duration,
          publish_status: publishStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create content");

      setTitle("");
      setModuleName("");
      setDescription("");
      setVideoUrl("");
      setCreateModalOpen(false);
      fetchContents();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch(`/api/content/${editingContent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course_id: courseId,
          module_name: moduleName,
          description,
          video_url: videoUrl,
          duration,
          publish_status: publishStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update content");

      setEditingContent(null);
      fetchContents();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContent = async (id: string, titleStr: string) => {
    if (!confirm(`Are you sure you want to delete content "${titleStr}"?`)) return;
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (res.ok) fetchContents();
    } catch (err) {
      console.error("Delete content error", err);
    }
  };

  const openEditModal = (c: ContentItem) => {
    setEditingContent(c);
    setTitle(c.title);
    setCourseId(c.course_id);
    setModuleName(c.module_name || "");
    setDescription(c.description || "");
    setVideoUrl(c.video_url);
    setDuration(c.duration || "45 mins");
    setPublishStatus(c.publish_status);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academic</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Recorded Content</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Recorded Content Library
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage course video lectures and digital learning resources.
          </p>
        </div>

        <button
          onClick={() => {
            setTitle("");
            setModuleName("");
            setDescription("");
            setVideoUrl("");
            if (activeCourses.length > 0) setCourseId(activeCourses[0].id);
            setFormError("");
            setCreateModalOpen(true);
          }}
          disabled={activeCourses.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Recorded Content
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content by title or module..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
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

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading recorded content...</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <PlayCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No recorded content published</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload video lecture links to build your online learning repository.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              disabled={activeCourses.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Recorded Content
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Video Title</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Module</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Published Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {contents.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                        {c.title}
                      </p>
                      <a
                        href={c.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        Open Content URL <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {c.course?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {c.module_name || "General"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {c.duration || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                          c.publish_status === "Published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {c.publish_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Content"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContent(c.id, c.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Content"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {(createModalOpen || editingContent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setCreateModalOpen(false);
                setEditingContent(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              {editingContent ? "Edit Recorded Content" : "Add Recorded Content"}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Provide video lecture URL and curriculum module details
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={editingContent ? handleEditContent : handleCreateContent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Course <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  <option value="">Select active course...</option>
                  {activeCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Video Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Introduction to Data Structures"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Video / Content URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/... or Vimeo link"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Module / Unit Name
                  </label>
                  <input
                    type="text"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g. Module 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Video Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 45 mins"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Publish Status
                </label>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of concepts explained in video..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingContent(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editingContent ? (
                    "Save Changes"
                  ) : (
                    "Add Content"
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
