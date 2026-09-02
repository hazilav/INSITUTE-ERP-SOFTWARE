"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  ChevronRight,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  UserX,
  Sparkles,
  Copy,
  Share2,
  ExternalLink,
  Check,
  KeyRound,
} from "lucide-react";
import CreateStaffModal from "@/components/CreateStaffModal";
import Toast from "@/components/Toast";
import ErrorState from "@/components/ErrorState";
import { getStaffPortalUrl, getStudentPortalUrl, sharePortalLink } from "@/lib/urls";
import { fetchWithRetry } from "@/lib/api-client";

interface StaffItem {
  id: string;
  employee_id: string;
  name: string;
  photo?: string | null;
  phone: string;
  email?: string | null;
  department: string;
  designation: string;
  role: string;
  status: string;
  joining_date: string;
  assigned_course_id?: string | null;
  assigned_batch_id?: string | null;
  permissions?: string | null;
  assigned_course?: { name: string } | null;
  assigned_batch?: { name: string } | null;
  user?: {
    id: string;
    email: string;
    status: string;
    last_login?: string | null;
  } | null;
}

interface Metrics {
  total: number;
  active: number;
  mentors: number;
  admins: number;
  inactive: number;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    active: 0,
    mentors: 0,
    admins: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
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
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);

  const staffPortalUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : getStaffPortalUrl();
  const studentPortalUrl = typeof window !== "undefined" ? `${window.location.origin}/student/login` : getStudentPortalUrl();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (deptFilter !== "ALL") params.set("department", deptFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetchWithRetry<{
        success: boolean;
        staff: StaffItem[];
        metrics: any;
      }>(`/api/staff?${params.toString()}`);

      if (res.ok && res.data?.success) {
        setStaffList(res.data.staff || []);
        setMetrics(res.data.metrics || { total: 0, active: 0, mentors: 0, admins: 0, inactive: 0 });
      } else {
        setFetchError(res.error || "Failed to load staff members.");
      }
    } catch (err: any) {
      console.error("Failed to fetch staff data", err);
      setFetchError("Unable to load staff data right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, deptFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMessage(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleShare = (title: string, text: string, url: string) => {
    sharePortalLink(title, text, url, () => {
      setToastMessage(`${title} details copied!`);
    });
  };

  const handleToggleStatus = async (staff: StaffItem) => {
    const newStatus = staff.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setToastMessage(`Staff account ${newStatus === "Active" ? "activated" : "deactivated"}.`);
        fetchStaff();
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return { label: "ADMIN", style: "bg-purple-100 text-purple-800 border-purple-200" };
      case "MENTOR":
        return { label: "MENTOR", style: "bg-brand-100 text-brand-800 border-brand-200" };
      case "STAFF":
        return { label: "STAFF", style: "bg-blue-100 text-blue-800 border-blue-200" };
      default:
        return { label: role, style: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return { label: "Active", style: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "On Leave":
        return { label: "On Leave", style: "bg-amber-100 text-amber-800 border-amber-200" };
      case "Inactive":
      case "Resigned":
        return { label: status, style: "bg-rose-100 text-rose-800 border-rose-200" };
      default:
        return { label: status, style: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500">People</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-bold">Staff & Mentors</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Staff & Mentor Portal Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create employee accounts, assign mentors to courses & batches, and manage granular staff permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingStaff(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* SECTION 11: PORTAL LINKS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Staff Portal Link</h3>
                <p className="text-[11px] text-slate-400">Daily-work interface for Staff & Mentors</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-mono font-bold uppercase">
              Active
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300 truncate">
            {staffPortalUrl}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={staffPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Portal
            </a>
            <button
              onClick={() => handleCopy(staffPortalUrl, "staff-link", "Staff Portal Link")}
              className="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedKey === "staff-link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === "staff-link" ? "Copied" : "Copy Link"}</span>
            </button>
            <button
              onClick={() => handleShare("Staff Portal", `Access Institute Staff Portal:\n${staffPortalUrl}`, staffPortalUrl)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Student Portal Link</h3>
                <p className="text-[11px] text-slate-400">Self-service dashboard for enrolled students</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold uppercase">
              Active
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300 truncate">
            {studentPortalUrl}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={studentPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Portal
            </a>
            <button
              onClick={() => handleCopy(studentPortalUrl, "student-link", "Student Portal Link")}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedKey === "student-link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === "student-link" ? "Copied" : "Copy Link"}</span>
            </button>
            <button
              onClick={() => handleShare("Student Portal", `Access Student Portal:\n${studentPortalUrl}`, studentPortalUrl)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">{metrics.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mentors</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1 font-mono">{metrics.mentors}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admins</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1 font-mono">{metrics.admins}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{metrics.inactive}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
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
            placeholder="Search staff by name, Staff ID, phone, email, or designation..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="MENTOR">Mentor</option>
              <option value="TEACHER">Teacher</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading staff records...</p>
          </div>
        ) : fetchError && staffList.length === 0 ? (
          <ErrorState
            title="Failed to load staff"
            message={fetchError}
            onRetry={fetchStaff}
            className="border-none shadow-none my-0"
          />
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No staff members found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Add instructors, mentors, and staff members to manage classes and assigned students.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingStaff(null);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Staff Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Staff ID</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Assigned Course / Batch</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {staffList.map((st) => {
                  const roleBadge = getRoleBadge(st.role);
                  const statusBadge = getStatusBadge(st.status);
                  const assignedText = st.assigned_batch?.name
                    ? st.assigned_batch.name
                    : st.assigned_course?.name
                    ? st.assigned_course.name
                    : "Not assigned";

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/staff/${st.id}`}
                          className="font-bold text-slate-900 hover:text-brand-600 hover:underline text-sm block"
                        >
                          {st.name}
                        </Link>
                        {st.email && (
                          <span className="text-xs text-slate-400 font-normal block">{st.email}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-brand-600 text-xs">
                        {st.employee_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${roleBadge.style}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">{assignedText}</td>
                      <td className="px-6 py-4 text-xs font-mono">{st.phone}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${statusBadge.style}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopy(st.employee_id, `id-${st.id}`, `Staff ID (${st.name})`)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Copy Staff ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/dashboard/staff/${st.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Staff Profile & Credentials"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingStaff(st);
                              setCreateModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(st)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={st.status === "Active" ? "Deactivate Account" : "Activate Account"}
                          >
                            <UserX className="w-4 h-4" />
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

      {/* Add / Edit Staff Modal */}
      <CreateStaffModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchStaff}
        editingStaff={editingStaff}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
