"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  GraduationCap,
  BadgeDollarSign,
  UserCheck,
  BarChart3,
  Settings,
  Building2,
  X,
  CalendarCheck,
  ClipboardList,
  FileText,
  FileBarChart,
  ChevronDown,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface SidebarProps {
  instituteName: string;
  logo?: string | null;
  role: string;
  isOpen: boolean;
  onClose: () => void;
  instituteMode?: string;
}

export default function Sidebar({
  instituteName,
  logo,
  role,
  isOpen,
  onClose,
  instituteMode = "hybrid",
}: SidebarProps) {
  const pathname = usePathname() || "";
  const isAdmissions = pathname === "/dashboard/admissions" || pathname.startsWith("/dashboard/admissions/");
  const isStudents =
    (pathname === "/dashboard/students" ||
      (pathname.startsWith("/dashboard/students/") &&
        !pathname.startsWith("/dashboard/students/documents") &&
        !pathname.startsWith("/dashboard/students/certificates"))) &&
    !isAdmissions;

  const handleNavClick = () => {
    // Only invoke onClose if mobile drawer is currently open to avoid cancelling Next.js desktop navigations
    if (isOpen) {
      onClose();
    }
  };

  const [academicsOpen, setAcademicsOpen] = useState(
    pathname.startsWith("/dashboard/courses") ||
      pathname.startsWith("/dashboard/batches") ||
      pathname.startsWith("/dashboard/classes") ||
      pathname.startsWith("/dashboard/activities") ||
      pathname.startsWith("/dashboard/marks")
  );

  const isStaffOrMentor = role === "STAFF" || role === "MENTOR";

  // Section 10: STAFF PORTAL NAVIGATION
  if (isStaffOrMentor) {
    const staffNavItems = [
      { name: "Home", href: "/dashboard", icon: LayoutDashboard, active: pathname === "/dashboard" },
      { name: "My Tasks", href: "/dashboard/reports/staff-tasks", icon: ClipboardList, active: pathname.startsWith("/dashboard/reports/staff-tasks") },
      { name: "My Classes", href: "/dashboard/classes", icon: GraduationCap, active: pathname.startsWith("/dashboard/classes") },
      { name: "Students", href: "/dashboard/students", icon: Users, active: pathname === "/dashboard/students" },
      { name: "Activities", href: "/dashboard/activities", icon: ClipboardList, active: pathname.startsWith("/dashboard/activities") },
      { name: "Attendance", href: "/dashboard/staff/my-attendance", icon: CalendarCheck, active: pathname.startsWith("/dashboard/staff/my-attendance") },
      { name: "Profile", href: "/dashboard/staff", icon: UserCheck, active: pathname === "/dashboard/staff" },
    ];

    return (
      <>
        {isOpen && (
          <div onClick={onClose} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity" />
        )}
        <aside className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
              {logo ? (
                <img src={logo} alt={instituteName} className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <h1 className="font-bold text-white text-sm truncate leading-tight">{instituteName}</h1>
                <p className="text-[11px] text-slate-400 font-mono uppercase">Staff Portal</p>
              </div>
            </Link>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {staffNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  item.active
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          <div className="p-3 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs text-slate-400 flex justify-between">
              <span>Role:</span>
              <span className="font-bold text-brand-400 uppercase">{role}</span>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Section 3: OWNER / ADMIN NAVIGATION
  const academicsSubItems = [
    { name: "Courses", href: "/dashboard/courses", icon: BookOpen, active: pathname.startsWith("/dashboard/courses") },
    { name: "Batches", href: "/dashboard/batches", icon: Layers, active: pathname.startsWith("/dashboard/batches") },
    { name: "Classes", href: "/dashboard/classes", icon: GraduationCap, active: pathname.startsWith("/dashboard/classes") },
    { name: "Activities", href: "/dashboard/activities", icon: ClipboardList, active: pathname.startsWith("/dashboard/activities") },
    { name: "Marks & Results", href: "/dashboard/marks", icon: FileBarChart, active: pathname.startsWith("/dashboard/marks") },
  ];

  const isAcademicsActive = academicsSubItems.some((sub) => sub.active);

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity" />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            {logo ? (
              <img src={logo} alt={instituteName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <h1 className="font-bold text-white text-sm truncate leading-tight">{instituteName}</h1>
              <p className="text-[11px] text-slate-400 font-mono uppercase">Institute CRM</p>
            </div>
          </Link>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname === "/dashboard" ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/dashboard/admissions"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              isAdmissions ? "bg-brand-600 text-white shadow-md shadow-brand-600/20 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserPlus className={`w-5 h-5 shrink-0 ${isAdmissions ? "text-white" : "text-indigo-400"}`} />
            <span>Admissions</span>
          </Link>

          <Link
            href="/dashboard/students"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              isStudents
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20 font-bold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span>Students</span>
          </Link>

          {/* Academics Parent Section with Submenu */}
          <div>
            <button
              type="button"
              onClick={() => setAcademicsOpen(!academicsOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                isAcademicsActive ? "bg-slate-800/80 text-white font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
                <span>Academics</span>
              </div>
              {academicsOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {academicsOpen && (
              <div className="ml-4 pl-3 border-l border-slate-800 space-y-1 my-1">
                {academicsSubItems.map((sub) => (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                      sub.active ? "bg-brand-600 text-white font-bold shadow-xs" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <sub.icon className="w-4 h-4 shrink-0" />
                    <span>{sub.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/attendance"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname.startsWith("/dashboard/attendance") ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <CalendarCheck className="w-5 h-5 shrink-0" />
            <span>Attendance</span>
          </Link>

          <Link
            href="/dashboard/fees"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname.startsWith("/dashboard/fees") ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BadgeDollarSign className="w-5 h-5 shrink-0" />
            <span>Fees</span>
          </Link>

          <Link
            href="/dashboard/staff"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname === "/dashboard/staff" || pathname.startsWith("/dashboard/staff/") ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserCheck className="w-5 h-5 shrink-0" />
            <span>Staff & Mentors</span>
          </Link>

          <Link
            href="/dashboard/reports/staff-tasks"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname.startsWith("/dashboard/reports/staff-tasks") ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            <span>Tasks</span>
          </Link>

          <Link
            href="/dashboard/reports"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname === "/dashboard/reports" ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span>Reports</span>
          </Link>

          <Link
            href="/dashboard/students/documents"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname.startsWith("/dashboard/students/documents") ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Documents</span>
          </Link>

          <Link
            href="/dashboard/settings"
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer select-none ${
              pathname === "/dashboard/settings" ? "bg-brand-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>

        <div className="p-3 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Role</span>
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide">{role}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 capitalize">
              Operational Mode: {instituteMode}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
