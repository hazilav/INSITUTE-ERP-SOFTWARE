"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlayCircle,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  BookOpen,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import VideoPlayerModal from "./VideoPlayerModal";

interface RecordedClass {
  id: string;
  title: string;
  subject?: string | null;
  teacher_name?: string | null;
  class_date?: string | null;
  duration?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url: string;
  publish_status: string;
  course?: { id: string; name: string; code?: string | null } | null;
  batch?: { id: string; name: string } | null;
}

interface StudentRecordedClassesClientProps {
  courseName: string;
  courseCode?: string | null;
  hasCourse: boolean;
}

export default function StudentRecordedClassesClient({
  courseName,
  courseCode,
  hasCourse,
}: StudentRecordedClassesClientProps) {
  const [classes, setClasses] = useState<RecordedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Available subjects collected dynamically from classes
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // Video Player Modal State
  const [selectedVideo, setSelectedVideo] = useState<RecordedClass | null>(null);

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    if (!hasCourse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (subjectFilter !== "ALL") params.set("subject", subjectFilter);
      if (teacherFilter.trim()) params.set("teacher", teacherFilter.trim());
      if (dateFilter) params.set("date", dateFilter);

      const res = await fetch(`/api/recorded-classes?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load recorded classes");
      }
      const data = await res.json();
      const list: RecordedClass[] = data.recordedClasses || [];
      setClasses(list);

      // Extract unique subjects
      const subjects = new Set<string>();
      list.forEach((c) => {
        if (c.subject && c.subject.trim()) subjects.add(c.subject.trim());
      });
      setSubjectsList(Array.from(subjects));
    } catch (err: any) {
      setError(err.message || "Failed to load recorded classes");
    } finally {
      setLoading(false);
    }
  }, [hasCourse, search, subjectFilter, teacherFilter, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClasses();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClasses]);

  const handleWatch = (item: RecordedClass) => {
    setSelectedVideo(item);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSubjectFilter("ALL");
    setTeacherFilter("");
    setDateFilter("");
  };

  const hasActiveFilters = Boolean(
    search.trim() || subjectFilter !== "ALL" || teacherFilter.trim() || dateFilter
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Course: {courseName} {courseCode ? `(${courseCode})` : ""}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Recorded Classes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Access previous lectures, replay key topics, and catch up at your own pace.
          </p>
        </div>
      </div>

      {!hasCourse ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-xl mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-900">No Course Assigned</h3>
          <p className="text-sm text-amber-700 mt-1">
            You are not currently enrolled in an active course. Please contact your institute administrator to get enrolled.
          </p>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search class title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              {/* Subject Filter */}
              <div className="relative">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  <option value="ALL">All Subjects</option>
                  {subjectsList.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by teacher..."
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Filters applied • Showing {classes.length} {classes.length === 1 ? "class" : "classes"}
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Classes Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 animate-pulse">
                  <div className="w-full aspect-video bg-slate-200 rounded-2xl" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold text-sm">{error}</p>
              <button
                onClick={fetchClasses}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs"
              >
                Try Again
              </button>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {hasActiveFilters ? "No matches found" : "No recorded classes yet"}
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {hasActiveFilters
                  ? "Try clearing some of your search or date filters to find available lectures."
                  : `There are no published recorded lectures for ${courseName} yet. New lectures will appear here once uploaded.`}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200/80 hover:border-brand-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Thumbnail & Video duration */}
                    <div
                      onClick={() => handleWatch(item)}
                      className="relative w-full aspect-video bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-t-3xl overflow-hidden cursor-pointer flex items-center justify-center"
                    >
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <PlayCircle className="w-12 h-12 text-white/70 group-hover:scale-110 group-hover:text-brand-400 transition-all" />
                          <span className="text-[11px] font-medium text-slate-300">Click to Play</span>
                        </div>
                      )}

                      {/* Duration badge */}
                      {item.duration && (
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3 text-brand-400" />
                          {item.duration}
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <PlayCircle className="w-6 h-6 fill-current" />
                        </div>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {item.subject ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] uppercase tracking-wider">
                            {item.subject}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                            Lecture
                          </span>
                        )}

                        {item.class_date && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(item.class_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-brand-600 transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {item.teacher_name && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 font-medium">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span>Instructor: <strong className="text-slate-900">{item.teacher_name}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watch Action Bar */}
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleWatch(item)}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Watch Class
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={
          selectedVideo
            ? {
                id: selectedVideo.id,
                title: selectedVideo.title,
                subject: selectedVideo.subject,
                teacher_name: selectedVideo.teacher_name,
                course_name: selectedVideo.course?.name || courseName,
                duration: selectedVideo.duration,
                video_url: selectedVideo.video_url,
                description: selectedVideo.description,
              }
            : null
        }
      />
    </div>
  );
}
