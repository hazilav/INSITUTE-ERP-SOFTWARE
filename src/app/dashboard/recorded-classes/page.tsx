"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Video,
  Clock,
  User,
  UploadCloud,
  CheckCircle2,
  RotateCcw,
  Eye,
  FileVideo,
  Calendar,
  Image as ImageIcon,
  ChevronLeft,
} from "lucide-react";
import ErrorState from "@/components/ErrorState";
import Modal from "@/components/Modal";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import { fetchWithRetry } from "@/lib/api-client";

interface RecordedClassItem {
  id: string;
  title: string;
  course_id: string;
  batch_id?: string | null;
  subject?: string | null;
  description?: string | null;
  teacher_name?: string | null;
  class_date?: string | null;
  video_url: string;
  storage_key?: string | null;
  thumbnail_url?: string | null;
  duration?: string | null;
  file_size?: string | null;
  publish_status: string;
  created_at: string;
  course?: { id: string; name: string; code?: string | null };
  batch?: { id: string; name: string } | null;
  created_by?: { id: string; name: string; email: string } | null;
}

interface SelectOption {
  id: string;
  name: string;
  code?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecordedClassesPage() {
  const [classes, setClasses] = useState<RecordedClassItem[]>([]);
  const [activeCourses, setActiveCourses] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pagination & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Watch Player Modal
  const [selectedVideo, setSelectedVideo] = useState<RecordedClassItem | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecordedClassItem | null>(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RecordedClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCourseId, setFormCourseId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacher, setFormTeacher] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDescription, setFormDescription] = useState("");
  const [formPublishStatus, setFormPublishStatus] = useState("Published");
  const [formDuration, setFormDuration] = useState("45 mins");

  // Video Source (Direct File Upload vs URL)
  const [videoSourceType, setVideoSourceType] = useState<"upload" | "url">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");

  // Video Upload Progress & State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Form submission state
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (courseFilter !== "ALL") params.set("course_id", courseFilter);
      if (statusFilter !== "ALL") params.set("publish_status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "12");

      const res = await fetchWithRetry<{
        success: boolean;
        recordedClasses: RecordedClassItem[];
        total: number;
        page: number;
        totalPages: number;
        activeCourses: SelectOption[];
      }>(`/api/recorded-classes?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setClasses(res.data.recordedClasses || []);
        setActiveCourses(res.data.activeCourses || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.activeCourses && res.data.activeCourses.length > 0 && !formCourseId) {
          setFormCourseId(res.data.activeCourses[0].id);
        }
      } else {
        setFetchError(res.error || "Failed to load recorded classes.");
      }
    } catch (err: any) {
      console.error("Fetch classes error", err);
      setFetchError("Unable to load recorded classes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, courseFilter, statusFilter, page, formCourseId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Handle direct file upload with live XMLHttpRequest progress
  const uploadVideoFile = async (file: File) => {
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");

    try {
      // 1. Get presigned upload URL
      const presignRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "video/mp4",
          fileSize: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.error || "Failed to prepare video upload");
      }

      const { uploadUrl, fileKey, publicUrl, headers, isDirectS3 } = presignData;

      // 2. Perform direct upload with progress tracking
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setUploadStatus("success");
          setVideoUrl(publicUrl || uploadUrl.split("?")[0]);
          setStorageKey(fileKey);
          setFileSizeStr(formatFileSize(file.size));
        } else {
          setUploadStatus("error");
          setUploadError(`Upload failed with status code ${xhr.status}.`);
        }
      };

      xhr.onerror = () => {
        setUploadStatus("error");
        setUploadError("Network error during video upload. Please retry.");
      };

      if (isDirectS3) {
        // Direct S3/R2 PUT
        xhr.open("PUT", uploadUrl);
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            xhr.setRequestHeader(k, v as string);
          }
        }
        xhr.send(file);
      } else {
        // Local streaming endpoint POST
        xhr.open("POST", uploadUrl);
        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      }
    } catch (err: any) {
      setUploadStatus("error");
      setUploadError(err.message || "An unexpected error occurred during upload.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      uploadVideoFile(file);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setThumbnailUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "activities");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setThumbnailUrl(data.url);
      } else {
        alert(data.error || "Failed to upload thumbnail.");
      }
    } catch (err) {
      console.error("Thumbnail upload failed", err);
      alert("Failed to upload thumbnail.");
    } finally {
      setThumbnailUploading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle("");
    if (activeCourses.length > 0) setFormCourseId(activeCourses[0].id);
    setFormSubject("");
    setFormTeacher("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDescription("");
    setFormPublishStatus("Published");
    setFormDuration("45 mins");
    setVideoSourceType("upload");
    setVideoUrl("");
    setStorageKey("");
    setFileSizeStr("");
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setThumbnailUrl("");
    setFormError("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: RecordedClassItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCourseId(item.course_id);
    setFormSubject(item.subject || "");
    setFormTeacher(item.teacher_name || "");
    setFormDate(
      item.class_date
        ? new Date(item.class_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setFormDescription(item.description || "");
    setFormPublishStatus(item.publish_status);
    setFormDuration(item.duration || "45 mins");
    setVideoUrl(item.video_url);
    setStorageKey(item.storage_key || "");
    setFileSizeStr(item.file_size || "");
    setVideoSourceType("url");
    setThumbnailUrl(item.thumbnail_url || "");
    setSelectedFile(null);
    setUploadStatus("idle");
    setFormError("");
    setModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Class title is required.");
      return;
    }

    if (!formCourseId) {
      setFormError("Please select a course.");
      return;
    }

    if (!videoUrl) {
      if (videoSourceType === "upload" && uploadStatus === "uploading") {
        setFormError("Please wait for the video upload to complete.");
        return;
      }
      setFormError("Please upload a video or provide a video URL.");
      return;
    }

    setFormSubmitting(true);

    try {
      const payload = {
        title: formTitle.trim(),
        course_id: formCourseId,
        subject: formSubject.trim() || null,
        teacher_name: formTeacher.trim() || null,
        class_date: formDate ? new Date(formDate).toISOString() : null,
        description: formDescription.trim() || null,
        video_url: videoUrl.trim(),
        storage_key: storageKey || null,
        thumbnail_url: thumbnailUrl || null,
        duration: formDuration || null,
        file_size: fileSizeStr || null,
        publish_status: formPublishStatus,
      };

      const url = editingItem ? `/api/recorded-classes/${editingItem.id}` : "/api/recorded-classes";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save recorded class.");
      }

      setModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick toggle Publish / Unpublish
  const handleToggleStatus = async (item: RecordedClassItem) => {
    const nextStatus = item.publish_status === "Published" ? "Draft" : "Published";
    try {
      const res = await fetch(`/api/recorded-classes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish_status: nextStatus }),
      });
      if (res.ok) {
        fetchClasses();
      }
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  // Delete Confirmation Handler
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/recorded-classes/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete recorded class.");
      }

      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchClasses();
    } catch (err: any) {
      alert(err.message || "Error deleting recorded class.");
    } finally {
      setDeleting(false);
    }
  };

  // Stats calculation
  const publishedCount = classes.filter((c) => c.publish_status === "Published").length;
  const draftCount = classes.filter((c) => c.publish_status === "Draft").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">Academics</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Recorded Classes</span>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Video className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Recorded Classes
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Upload, organize, and manage video lectures for institute courses.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={activeCourses.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Upload Recorded Class
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Classes
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
            {totalCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Published
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {publishedCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
            Drafts
          </span>
          <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {draftCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Courses With Videos
          </span>
          <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">
            {activeCourses.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, subject, teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Courses</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {fetchError ? (
        <ErrorState
          title="Error Loading Recorded Classes"
          message={fetchError}
          onRetry={fetchClasses}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse space-y-3"
            >
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <FileVideo className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Recorded Classes Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
            {search || courseFilter !== "ALL" || statusFilter !== "ALL"
              ? "No classes match your search and filter criteria. Try adjusting your filters."
              : "Start building your digital learning library by uploading your first recorded class video."}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Upload Recorded Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {classes.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => {
                  setSelectedVideo(item);
                  setPlayerOpen(true);
                }}
                className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600/30 text-brand-400 flex items-center justify-center mb-2 shadow-inner">
                      <PlayCircle className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-bold text-white/90 line-clamp-1">
                      {item.subject || item.course?.name || "Recorded Lecture"}
                    </span>
                  </div>
                )}

                {/* Duration Badge */}
                {item.duration && (
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[11px] font-mono font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.duration}
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      item.publish_status === "Published"
                        ? "bg-emerald-500/90 text-white shadow-xs"
                        : "bg-amber-500/90 text-white shadow-xs"
                    }`}
                  >
                    {item.publish_status}
                  </span>
                </div>

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-6 h-6 fill-current text-brand-600 translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold truncate max-w-[180px]">
                      {item.course?.name || "Course"}
                    </span>
                    {item.subject && (
                      <span className="text-[11px] font-medium text-slate-400 truncate">
                        • {item.subject}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => {
                      setSelectedVideo(item);
                      setPlayerOpen(true);
                    }}
                    className="text-sm sm:text-base font-bold text-slate-900 hover:text-brand-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Meta details */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.teacher_name || "Instructor"}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.class_date
                        ? new Date(item.class_date).toLocaleDateString()
                        : new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {item.file_size && (
                    <div className="text-[11px] text-slate-400">
                      Size: <span className="font-mono text-slate-600">{item.file_size}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVideo(item);
                      setPlayerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Watch
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        item.publish_status === "Published"
                          ? "text-amber-700 hover:bg-amber-50"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}
                      title={item.publish_status === "Published" ? "Set to Draft" : "Publish class"}
                    >
                      {item.publish_status === "Published" ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit class"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemToDelete(item);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} ({totalCount} total classes)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={playerOpen}
        onClose={() => {
          setPlayerOpen(false);
          setSelectedVideo(null);
        }}
        video={
          selectedVideo
            ? {
                id: selectedVideo.id,
                title: selectedVideo.title,
                subject: selectedVideo.subject,
                teacher_name: selectedVideo.teacher_name,
                course_name: selectedVideo.course?.name,
                duration: selectedVideo.duration,
                video_url: selectedVideo.video_url,
                storage_key: selectedVideo.storage_key,
                description: selectedVideo.description,
              }
            : null
        }
      />

      {/* Upload & Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Edit Recorded Class" : "Upload Recorded Class"}
        subtitle="Manage lecture video files, course associations, and student viewing status"
        icon={<Video className="w-5 h-5" />}
        maxWidth="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitForm}
              disabled={formSubmitting || uploadStatus === "uploading"}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {formSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : editingItem ? (
                "Save Changes"
              ) : (
                "Save Recorded Class"
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Class Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Lecture 01 — Introduction to Digital Marketing"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          {/* Course & Subject Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                value={formCourseId}
                onChange={(e) => setFormCourseId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-medium"
              >
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subject / Topic
              </label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. Meta Ads, SEO Basics, Calculus"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Teacher, Class Date & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Teacher / Mentor
              </label>
              <input
                type="text"
                value={formTeacher}
                onChange={(e) => setFormTeacher(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Class Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duration
              </label>
              <input
                type="text"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="e.g. 45 mins"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Video Source Tabs */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Video Storage & Source <span className="text-red-500">*</span>
              </span>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setVideoSourceType("upload")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    videoSourceType === "upload"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSourceType("url")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    videoSourceType === "url"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Direct URL
                </button>
              </div>
            </div>

            {videoSourceType === "upload" ? (
              <div className="space-y-3">
                {/* Upload Drag & Drop Area */}
                <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-6 text-center transition-colors bg-white">
                  <input
                    type="file"
                    id="video-upload-input"
                    accept="video/mp4,video/webm,video/mkv,video/mov,video/avi"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="video-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-brand-600 hover:underline">
                        Click to select video file
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports MP4, WebM, MKV, MOV (large recorded lectures allowed)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Upload Status Card */}
                {uploadStatus === "uploading" && (
                  <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-brand-900">
                      <span>Uploading video to storage...</span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-brand-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 transition-all duration-200 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-brand-700">
                      Uploading directly to video storage. Form data is preserved.
                    </p>
                  </div>
                )}

                {uploadStatus === "success" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Upload complete!</span>
                        {selectedFile && (
                          <span className="text-emerald-700 block text-[11px]">
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </span>
                        )}
                      </div>
                    </div>
                    <label
                      htmlFor="video-upload-input"
                      className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      Replace
                    </label>
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <div>
                        <span className="font-bold">Upload failed</span>
                        <p className="text-[11px] text-red-600">{uploadError}</p>
                      </div>
                    </div>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => uploadVideoFile(selectedFile)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://... (Vimeo, YouTube, CloudFront, CDN MP4, Bunny.net)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter a streaming video URL or pre-hosted playback link.
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Video Thumbnail (Optional)
              </label>
              <span className="text-[11px] text-slate-400">
                Default placeholder will be used if omitted
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                id="thumbnail-upload"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
              <label
                htmlFor="thumbnail-upload"
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-slate-400" />
                {thumbnailUploading ? "Uploading..." : "Choose Image"}
              </label>

              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Or paste thumbnail image URL..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            {thumbnailUrl && (
              <div className="mt-2 relative w-24 h-14 rounded-lg overflow-hidden border border-slate-200">
                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl("")}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Status & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={formPublishStatus}
                onChange={(e) => setFormPublishStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Published">Published (Visible to students)</option>
                <option value="Draft">Draft (Hidden)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Description
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Key topics covered, reading links, homework references..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Recorded Class?"
        subtitle="This action is permanent and cannot be undone."
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {deleting ? "Deleting..." : "Delete Recorded Class"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs sm:text-sm text-slate-600">
          <p>
            Are you sure you want to delete{" "}
            <strong className="text-slate-900">{itemToDelete?.title}</strong>?
          </p>
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            This will remove this recorded class from the course. This action cannot be undone.
          </div>
        </div>
      </Modal>
    </div>
  );
}
