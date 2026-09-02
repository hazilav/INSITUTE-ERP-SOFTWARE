"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus,
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  PhoneCall,
  ChevronRight,
  BookOpen,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import ErrorState from "@/components/ErrorState";
import { TableSkeleton } from "@/components/Skeleton";
import { fetchWithRetry } from "@/lib/api-client";

const AddStudentModal = dynamic(() => import("@/components/AddStudentModal"), { ssr: false });

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
  created_at?: string;
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

export default function AdmissionsPage() {
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

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ENROLLED" | "INQUIRY" | "ON_HOLD">("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<"ENROLLED" | "INQUIRY">("ENROLLED");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load available courses for filter
  useEffect(() => {
    fetchWithRetry<{ success: boolean; courses: { id: string; name: string }[] }>("/api/courses")
      .then((res) => {
        if (res.ok && res.data?.courses) {
          setCourses(res.data.courses);
        }
      })
      .catch((err) => console.error("Failed to load courses for admission filter", err));
  }, []);

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);

      // Map tab to API status
      if (activeTab === "ENROLLED") params.set("status", "ACTIVE");
      else if (activeTab === "INQUIRY" || activeTab === "ON_HOLD") params.set("status", "ON_HOLD");
      else params.set("status", "ALL");

      if (modeFilter !== "ALL") params.set("mode", modeFilter);
      params.set("archived", "false");

      const res = await fetchWithRetry<{
        success: boolean;
        students: StudentRecord[];
        metrics: any;
        suggestedCode?: string;
      }>(`/api/students?${params.toString()}`);

      if (res.ok && res.data?.success) {
        let list = res.data.students || [];
        if (courseFilter !== "ALL") {
          list = list.filter((s) => s.course_id === courseFilter);
        }
        setStudents(list);
        setMetrics(res.data.metrics || { total: 0, active: 0, onHold: 0, completed: 0, atRisk: 0 });
        if (res.data.suggestedCode) setSuggestedCode(res.data.suggestedCode);
      } else {
        setFetchError(res.error || "Failed to load admissions records.");
      }
    } catch (err: any) {
      console.error("Failed to fetch admissions:", err);
      setFetchError("Unable to load admissions records right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeTab, modeFilter, courseFilter]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  const openNewAdmission = (status: "ENROLLED" | "INQUIRY" = "ENROLLED") => {
    setModalInitialStatus(status);
    setAddModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-brand-900 to-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold tracking-wider uppercase">
            <UserPlus className="w-4 h-4" /> Admissions & Inquiries
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">
            Admissions Desk
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Track prospective student inquiries, process new registrations, and manage candidate enrollment pipelines.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => openNewAdmission("INQUIRY")}
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-all backdrop-blur-sm min-h-[42px]"
          >
            <PhoneCall className="w-4 h-4 text-indigo-300" />
            <span>+ Add Inquiry</span>
          </button>

          <button
            type="button"
            onClick={() => openNewAdmission("ENROLLED")}
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Admission</span>
          </button>
        </div>

        {/* Decorative Background Blob */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Admissions</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled (Active)</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inquiries / Follow-up</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics.onHold}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed / Alumni</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{metrics.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Records ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ENROLLED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ENROLLED"
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Enrolled ({metrics.active})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("INQUIRY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "INQUIRY"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Inquiries / Leads ({metrics.onHold})
            </button>
          </div>

          <Link
            href="/dashboard/students"
            className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
          >
            <span>Open Student Data Center</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, student code, phone, or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
            {/* Course Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Course:</span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Mode Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
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
      </div>

      {/* Admissions Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : fetchError && students.length === 0 ? (
          <ErrorState
            title="Failed to load admissions"
            message={fetchError}
            onRetry={fetchAdmissions}
            className="border-none shadow-none my-0"
          />
        ) : students.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <UserPlus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Admission Records Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No students or prospective inquiries match your current search and filter criteria.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openNewAdmission("INQUIRY")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" /> + New Inquiry
              </button>
              <button
                type="button"
                onClick={() => openNewAdmission("ENROLLED")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> + New Admission
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Candidate / Student</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Course & Batch</th>
                  <th className="px-6 py-3.5">Learning Mode</th>
                  <th className="px-6 py-3.5">Admission Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((student) => {
                  const isEnrolled = student.status === "ACTIVE";
                  const isOnHold = student.status === "ON_HOLD";
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-xs uppercase">
                            {(student.name || "S").charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {student.name || "Student"}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {student.student_code || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="space-y-0.5">
                          <a
                            href={`tel:${student.phone}`}
                            className="text-slate-800 hover:text-brand-600 font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{student.phone}</span>
                          </a>
                          {student.email && (
                            <p className="text-slate-400 flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[160px]">{student.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <p className="font-bold text-slate-900">
                          {student.course?.name || "Unassigned"}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {student.batch?.name || "No Batch"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200">
                          {student.learning_mode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Enrolled
                          </span>
                        ) : isOnHold ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Clock className="w-3 h-3" /> Inquiry / Follow-up
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {student.status}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 font-bold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student / Admission Modal */}
      {addModalOpen && (
        <AddStudentModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            fetchAdmissions();
          }}
          suggestedCode={suggestedCode}
          initialStatus={modalInitialStatus}
        />
      )}
    </div>
  );
}
