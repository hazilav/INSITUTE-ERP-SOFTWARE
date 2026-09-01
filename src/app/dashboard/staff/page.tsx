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
} from "lucide-react";
import CreateStaffModal from "@/components/CreateStaffModal";

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

  // Filters State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (deptFilter !== "ALL") params.set("department", deptFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/staff?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setStaffList(data.staff || []);
        setMetrics(data.metrics || { total: 0, active: 0, mentors: 0, admins: 0, inactive: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch staff data", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, deptFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleStatus = async (staff: StaffItem) => {
    const newStatus = staff.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchStaff();
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
            Staff & Mentor Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage institute employees, assign mentors to courses & batches, and configure role permissions.
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

      {/* Top Metric Summary Cards */}
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive / Resigned</p>
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
            placeholder="Search staff by name, Employee ID, phone, email, or designation..."
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
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
              <option value="Resigned">Resigned</option>
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
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No staff members found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Add instructors, mentors, and administrators to manage classes and students.
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
                  <th className="px-6 py-3.5">Employee ID</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {staffList.map((st) => {
                  const roleBadge = getRoleBadge(st.role);
                  const statusBadge = getStatusBadge(st.status);
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
                      <td className="px-6 py-4 text-xs">{st.department}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800">{st.designation}</td>
                      <td className="px-6 py-4 text-xs font-mono">{st.phone}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${statusBadge.style}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/staff/${st.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View Staff Profile"
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
                            title={st.status === "Active" ? "Deactivate Staff" : "Activate Staff"}
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
    </div>
  );
}
